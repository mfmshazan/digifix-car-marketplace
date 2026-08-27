import Stripe from 'stripe';
import prisma from '../lib/prisma.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function runBatchPayout({ roles, description }) {
  const candidates = await prisma.wallet.findMany({
    where: { balance: { gt: 0 }, user: { role: { in: roles } } },
    select: { id: true, user: { select: { id: true, name: true, email: true, stripeAccountId: true } } },
  });

  const results = { paid: [], skippedNoStripeAccount: [], skippedRaceCondition: [], failed: [] };

  for (const candidate of candidates) {
    if (!candidate.user.stripeAccountId) {
      results.skippedNoStripeAccount.push({
        userId: candidate.user.id,
        name: candidate.user.name,
        email: candidate.user.email,
      });
      continue;
    }

    let payoutAmount;
    let payoutTx;

    try {
      const txResult = await prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw`SELECT balance FROM "Wallet" WHERE id = ${candidate.id} FOR UPDATE`;
        const currentBalance = Number(locked[0]?.balance || 0);
        if (currentBalance <= 0) return null;

        await tx.wallet.update({ where: { id: candidate.id }, data: { balance: { decrement: currentBalance } } });
        const createdTx = await tx.walletTransaction.create({
          data: {
            amount: currentBalance,
            type: 'PAYOUT',
            senderWalletId: candidate.id,
            receiverWalletId: null,
            description: `${description} — ${candidate.user.name || candidate.user.email}`,
          },
        });
        return { amount: currentBalance, tx: createdTx };
      });

      if (!txResult) {
        results.skippedRaceCondition.push({ userId: candidate.user.id, name: candidate.user.name });
        continue;
      }
      payoutAmount = txResult.amount;
      payoutTx = txResult.tx;
    } catch (dbError) {
      console.error(`Batch payout DB error for wallet ${candidate.id}:`, dbError.message);
      results.failed.push({ userId: candidate.user.id, name: candidate.user.name, reason: 'db_error', error: dbError.message });
      continue;
    }

    try {
      const transfer = await stripe.transfers.create(
        {
          amount: Math.round(payoutAmount * 100),
          currency: process.env.PAYOUT_CURRENCY || 'lkr',
          destination: candidate.user.stripeAccountId,
          transfer_group: `PAYOUT_${candidate.id}`,
        },
        { idempotencyKey: `payout_${payoutTx.id}` }
      );

      results.paid.push({ userId: candidate.user.id, name: candidate.user.name, amount: payoutAmount, stripeTransferId: transfer.id });
    } catch (stripeError) {
      console.error(`Stripe payout failed for wallet ${candidate.id}, rolling back:`, stripeError.message);
      await prisma.$transaction([
        prisma.wallet.update({ where: { id: candidate.id }, data: { balance: { increment: payoutAmount } } }),
        prisma.walletTransaction.delete({ where: { id: payoutTx.id } }),
      ]);
      results.failed.push({ userId: candidate.user.id, name: candidate.user.name, amount: payoutAmount, reason: 'stripe_error', error: stripeError.message });
    }
  }

  return {
    ...results,
    summary: {
      totalEligible: candidates.length,
      paidCount: results.paid.length,
      skippedCount: results.skippedNoStripeAccount.length + results.skippedRaceCondition.length,
      failedCount: results.failed.length,
      totalPaidAmount: results.paid.reduce((s, r) => s + r.amount, 0),
    },
  };
}
