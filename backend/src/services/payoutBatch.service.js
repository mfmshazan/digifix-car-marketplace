// src/services/payoutBatch.service.js
import Stripe from 'stripe';
import prisma from '../lib/prisma.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Pays out every eligible wallet for the given roles.
 * "Eligible" = balance > 0 AND stripeAccountId is set.
 * Wallets without a connected Stripe account are skipped and reported,
 * never block the rest of the batch.
 *
 * Each wallet is its own DB transaction + Stripe call, so one failure
 * (Stripe decline, network blip, etc.) can never affect the others.
 */
export async function runBatchPayout({ roles, description }) {
    const wallets = await prisma.wallet.findMany({
        where: {
            balance: { gt: 0 },
            user: { role: { in: roles } },
        },
        include: { user: { select: { id: true, name: true, email: true, role: true, stripeAccountId: true } } },
    });

    const results = { paid: [], skippedNoStripeAccount: [], failed: [] };

    for (const wallet of wallets) {
        if (!wallet.user.stripeAccountId) {
            results.skippedNoStripeAccount.push({
                userId: wallet.user.id,
                name: wallet.user.name,
                email: wallet.user.email,
                balance: wallet.balance,
            });
            continue;
        }

        const payoutAmount = wallet.balance;
        const amountInCents = Math.round(payoutAmount * 100);

        // Phase 1: deduct from DB atomically
        let payoutTx;
        try {
            const [, createdTx] = await prisma.$transaction([
                prisma.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { decrement: payoutAmount } },
                }),
                prisma.walletTransaction.create({
                    data: {
                        amount: payoutAmount,
                        type: 'PAYOUT',
                        senderWalletId: wallet.id,
                        receiverWalletId: null,
                        description: `${description} — ${wallet.user.name || wallet.user.email}`,
                    },
                }),
            ]);
            payoutTx = createdTx;
        } catch (dbError) {
            console.error(`Batch payout DB error for wallet ${wallet.id}:`, dbError.message);
            results.failed.push({ userId: wallet.user.id, name: wallet.user.name, reason: 'db_error', error: dbError.message });
            continue;
        }

        // Phase 2: Stripe transfer, idempotent on payoutTx.id
        try {
            const transfer = await stripe.transfers.create(
                {
                    amount: amountInCents,
                    currency: 'lkr',
                    destination: wallet.user.stripeAccountId,
                    transfer_group: `PAYOUT_${wallet.id}`,
                },
                { idempotencyKey: `payout_${payoutTx.id}` }
            );

            results.paid.push({
                userId: wallet.user.id,
                name: wallet.user.name,
                amount: payoutAmount,
                stripeTransferId: transfer.id,
            });
        } catch (stripeError) {
            // Roll back the DB deduction — funds stay in the wallet for next run
            console.error(`Stripe payout failed for wallet ${wallet.id}, rolling back:`, stripeError.message);
            await prisma.$transaction([
                prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: payoutAmount } } }),
                prisma.walletTransaction.delete({ where: { id: payoutTx.id } }),
            ]);
            results.failed.push({
                userId: wallet.user.id,
                name: wallet.user.name,
                amount: payoutAmount,
                reason: 'stripe_error',
                error: stripeError.message,
            });
        }
    }

    return {
        ...results,
        summary: {
            totalEligible: wallets.length,
            paidCount: results.paid.length,
            skippedCount: results.skippedNoStripeAccount.length,
            failedCount: results.failed.length,
            totalPaidAmount: results.paid.reduce((s, r) => s + r.amount, 0),
        },
    };
}