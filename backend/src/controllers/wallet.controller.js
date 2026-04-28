import prisma from '../lib/prisma.js';
import Stripe from 'stripe';
import { getAdminWallet, ensureWallet } from '../lib/adminWallet.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class WalletController {

    /**
     * GET /wallet/my
     * Returns the authenticated user's wallet + last 30 transactions.
     */
    getMyWallet = async (req, res) => {
        try {
            const userId = req.user.id;
            let wallet = await prisma.wallet.findUnique({
                where: { userId },
                include: {
                    sentTransactions: {
                        orderBy: { createdAt: 'desc' },
                        take: 30,
                        include: { receiverWallet: { include: { user: { select: { name: true, role: true } } } } }
                    },
                    receivedTransactions: {
                        orderBy: { createdAt: 'desc' },
                        take: 30,
                        include: { senderWallet: { include: { user: { select: { name: true, role: true } } } } }
                    }
                }
            });

            if (!wallet) {
                wallet = await prisma.wallet.create({ data: { userId, balance: 0 } });
                wallet.sentTransactions = [];
                wallet.receivedTransactions = [];
            }

            // Merge and sort transactions for a unified feed
            const allTx = [
                ...wallet.sentTransactions.map(t => ({ ...t, direction: 'OUT' })),
                ...wallet.receivedTransactions.map(t => ({ ...t, direction: 'IN' })),
            ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30);

            return res.status(200).json({
                success: true,
                data: {
                    balance: wallet.balance,
                    walletId: wallet.id,
                    transactions: allTx,
                }
            });
        } catch (error) {
            console.error('getMyWallet error:', error);
            return res.status(500).json({ success: false, msg: 'Failed to fetch wallet' });
        }
    }

    getAllWallets = async (req, res) => {
        try {
            const wallets = await prisma.wallet.findMany();
            return res.status(200).json({ error: false, data: wallets, msg: 'Wallets fetched successfully', status: 200 });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: true, msg: 'Failed to fetch wallets', status: 500 });
        }
    }

    getWallet = async (req, res) => {
        try {
            const { userId } = req.body;
            const wallet = await prisma.wallet.findUnique({
                where: { userId: userId }
            });
            return res.status(200).json(wallet);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ msg: 'walletController --> getWallet: Failed to fetch wallet', error: true, status: 500 });
        }
    }

    addCustomersRefund = async (req, res) => {
        try {
            const { isAdminApproved, walletID, amount, orderId, salesmanWalletId } = req.body;
            if (!isAdminApproved) {
                return res.status(400).json({ msg: 'Refund is not approved by admin', error: true, status: 400 });
            }

            const safeAmount = parseFloat(amount);
            if (isNaN(safeAmount) || safeAmount <= 0) {
                return res.status(400).json({ msg: 'Invalid amount provided', error: true, status: 400 });
            }

            const adminWallet = await getAdminWallet();
            await prisma.$transaction([
                prisma.wallet.update({
                    where: { id: adminWallet.id },
                    data: { balance: { decrement: safeAmount } }
                }),
                prisma.wallet.update({
                    where: { id: walletID },
                    data: { balance: { increment: safeAmount } }
                }),
                prisma.wallet.update({
                    where: { id: salesmanWalletId },
                    data: { balance: { decrement: safeAmount } }
                }),
                prisma.walletTransaction.create({
                    data: {
                        amount: safeAmount,
                        type: "REFUND_SETTLEMENT",
                        senderWalletId: salesmanWalletId,
                        receiverWalletId: adminWallet.id,
                        orderId: orderId,
                        description: "Salesman funds clawed back for refund"
                    }
                }),
                prisma.walletTransaction.create({
                    data: {
                        amount: safeAmount,
                        type: "REFUND",
                        senderWalletId: adminWallet.id,
                        receiverWalletId: walletID,
                        orderId: orderId,
                        description: "Admin approved refund to customer"
                    }
                })
            ]);

            return res.status(200).json({ msg: 'Refund added successfully', error: false, status: 200 });

        } catch (error) {
            console.error("Refund processing error:", error);
            return res.status(500).json({ msg: 'walletController --> addCustomersRefund: Failed to process refund', error: true, status: 500 });
        }
    }

    addDeliveryPersonEarnings = async (req, res) => {
        try {
            const { walletID, amount, orderId } = req.body;
            const safeAmount = parseFloat(amount);
            
            if (isNaN(safeAmount) || safeAmount <= 0) {
                return res.status(400).json({ msg: 'Invalid amount provided', error: true, status: 400 });
            }

            const order = await prisma.order.findUnique({ where: { id: orderId } });

            if (!order || order.status !== 'DELIVERED') {
                return res.status(400).json({ msg: 'Order is not delivered', error: true, status: 400 });
            }

            const adminWallet = await getAdminWallet();
            await prisma.$transaction([
                prisma.wallet.update({ where: { id: adminWallet.id }, data: { balance: { decrement: safeAmount } } }),
                prisma.wallet.update({ where: { id: walletID }, data: { balance: { increment: safeAmount } } }),
                prisma.walletTransaction.create({
                    data: {
                        amount: safeAmount,
                        type: "EARNING",
                        senderWalletId: adminWallet.id,
                        receiverWalletId: walletID,
                        orderId: orderId,
                        description: "Delivery fee paid by admin to delivery person"
                    }
                })
            ]);

            return res.status(200).json({ msg: 'Earnings added successfully', error: false, status: 200 });
        } catch (error) {
            console.error("Earnings processing error:", error);
            return res.status(500).json({ msg: 'walletController --> addDeliveryPersonEarnings: Failed to process earnings', error: true, status: 500 });
        }
    }

    substractCODPayment = async (req, res) => {
        try {
            const { salespersonWalletID, deliveryWalletID, amount, orderId } = req.body;
            const safeAmount = parseFloat(amount);
            
            if (isNaN(safeAmount) || safeAmount <= 0) {
                return res.status(400).json({ msg: 'Invalid amount provided', error: true, status: 400 });
            }

            const order = await prisma.order.findUnique({ where: { id: orderId } });
            
            if (!order || order.status !== 'DELIVERED' || order.paymentMethod !== 'COD') {
                return res.status(400).json({ msg: 'Invalid order for COD processing', error: true, status: 400 });
            }

            await prisma.$transaction([
                prisma.wallet.update({
                    where: { id: deliveryWalletID },
                    data: { balance: { increment: safeAmount } }
                }),
                prisma.walletTransaction.create({
                    data: {
                        amount: safeAmount,
                        type: "COD_PAYMENT",
                        senderWalletId: null,
                        receiverWalletId: deliveryWalletID,
                        orderId: orderId,
                        codSettlementStatus: "PENDING",
                        description: "COD cash collected from customer, held by delivery person"
                    }
                })
            ]);

            return res.status(200).json({ msg: 'COD payment recorded successfully', error: false, status: 200 });
        } catch (error) {
            console.error("COD payment processing error:", error);
            return res.status(500).json({ msg: 'walletController --> substractCODPayment: Failed to process COD payment', error: true, status: 500 });
        }
    }

    settleCODPayment = async (req, res) => {
        try {
            const { transactionId, deliveryWalletID, salespersonWalletID } = req.body;

            const transaction = await prisma.walletTransaction.findUnique({
                where: { id: transactionId }
            });

            if (!transaction || transaction.type !== 'COD_PAYMENT' || transaction.codSettlementStatus !== 'PENDING') {
                return res.status(400).json({ msg: 'Invalid transaction for settlement', error: true, status: 400 });
            }

            const adminWallet = await getAdminWallet();
            await prisma.$transaction([
                prisma.walletTransaction.update({
                    where: { id: transactionId },
                    data: { codSettlementStatus: 'PAID' }
                }),
                // Delivery person hands cash to admin: deduct from delivery wallet, credit admin
                prisma.wallet.update({ where: { id: deliveryWalletID }, data: { balance: { decrement: transaction.amount } } }),
                prisma.wallet.update({ where: { id: adminWallet.id }, data: { balance: { increment: transaction.amount } } }),
                prisma.walletTransaction.create({
                    data: {
                        amount: transaction.amount,
                        type: "COD_REMITTANCE",
                        senderWalletId: deliveryWalletID,
                        receiverWalletId: adminWallet.id,
                        orderId: transaction.orderId,
                        codSettlementStatus: "PAID",
                        description: "COD cash remitted from delivery person to admin"
                    }
                })
            ]);
            return res.status(200).json({ msg: 'COD payment settled successfully', error: false, status: 200 });

        } catch (error) {
            console.error("COD settlement processing error:", error);
            return res.status(500).json({ msg: 'walletController --> settleCODPayment: Failed to settle COD payment', error: true, status: 500 });
        }
    }

    substractDeliveryPersonDayPayment = async (req, res) => {
        try {
            const { deliveryPersonWalletID } = req.body;
            const wallet = await prisma.wallet.findUnique({
                where: { id: deliveryPersonWalletID }
            });
            
            if (!wallet) return res.status(404).json({ msg: 'Delivery person wallet not found', error: true, status: 404 });
            if (wallet.balance <= 0) return res.status(400).json({ msg: 'Insufficient balance', error: true, status: 400 });
            
            const payoutAmount = wallet.balance;

            await prisma.$transaction([
                prisma.wallet.update({
                    where: { id: deliveryPersonWalletID },
                    data: { balance: { decrement: payoutAmount } }
                }),
                prisma.walletTransaction.create({
                    data: {
                        amount: payoutAmount,
                        type: "PAYOUT",
                        senderWalletId: deliveryPersonWalletID,
                        receiverWalletId: null,
                        codSettlementStatus: "NOT_APPLICABLE",
                        description: "Daily payout to delivery person"
                    }
                })
            ]);
            
            return res.status(200).json({ msg: 'Daily payment subtracted successfully', error: false, status: 200 });
        } catch (error) {
            console.error("Subtracting daily payment error:", error);
            return res.status(500).json({ msg: 'walletController --> substractDeliveryPersonDayPayment: Failed to subtract daily payment', error: true, status: 500 });
        }
    }

    addPurchaseAmountToSalesman = async (req, res) => {
        try {
            const { salesmanWalletID, amount, orderId } = req.body;
            const safeAmount = parseFloat(amount);
            
            if (isNaN(safeAmount) || safeAmount <= 0) {
                return res.status(400).json({ msg: 'Invalid amount provided', error: true, status: 400 });
            }

            const order = await prisma.order.findUnique({ where: { id: orderId } });

            if (!order || order.status !== 'DELIVERED') {
                return res.status(400).json({ msg: 'Order is not delivered', error: true, status: 400 });
            }

            const adminWallet = await getAdminWallet();
            await prisma.$transaction([
                prisma.wallet.update({ where: { id: adminWallet.id }, data: { balance: { decrement: safeAmount } } }),
                prisma.wallet.update({ where: { id: salesmanWalletID }, data: { balance: { increment: safeAmount } } }),
                prisma.walletTransaction.create({
                    data: {
                        amount: safeAmount,
                        type: "SALE_EARNING",
                        senderWalletId: adminWallet.id,
                        receiverWalletId: salesmanWalletID,
                        orderId: orderId,
                        description: "Sale earnings released from admin to salesman"
                    }
                })
            ]);

            return res.status(200).json({ msg: 'Purchase amount added to Salesman successfully', error: false, status: 200 });
        } catch (error) {
            console.error("Adding purchase amount error:", error);
            return res.status(500).json({ msg: 'walletController --> addPurchaseAmountToSalesman: Failed to add purchase amount', error: true, status: 500 });
        }
    }

    /**
     * POST /wallet/payout/salesman
     * Withdraws the salesman's full wallet balance to their connected Stripe account.
     * Uses a two-phase approach: record DB deduction first, then call Stripe.
     * On Stripe failure, the DB deduction is rolled back (idempotent via payoutTxId).
     */
    substractSaleRevenueFromSalesman = async (req, res) => {
        try {
            const userId = req.user?.id || req.body.userId;

            // Get wallet + stripeAccountId in one query
            const wallet = await prisma.wallet.findUnique({
                where: userId ? { userId } : { id: req.body.salesmanWalletID },
                include: { user: { select: { id: true, name: true, stripeAccountId: true } } }
            });

            if (!wallet) return res.status(404).json({ success: false, msg: 'Wallet not found' });
            if (wallet.balance <= 0) return res.status(400).json({ success: false, msg: 'No balance to withdraw' });
            if (!wallet.user.stripeAccountId) {
                return res.status(400).json({ success: false, msg: 'Stripe account not connected. Complete onboarding first.' });
            }

            const payoutAmount = wallet.balance;
            const amountInCents = Math.round(payoutAmount * 100);

            // Phase 1: Deduct from DB atomically
            let payoutTx;
            try {
                const [, createdTx] = await prisma.$transaction([
                    prisma.wallet.update({
                        where: { id: wallet.id },
                        data: { balance: { decrement: payoutAmount } }
                    }),
                    prisma.walletTransaction.create({
                        data: {
                            amount: payoutAmount,
                            type: 'PAYOUT',
                            senderWalletId: wallet.id,
                            receiverWalletId: null,
                            description: `Stripe payout to ${wallet.user.name || 'salesman'}`
                        }
                    })
                ]);
                payoutTx = createdTx;
            } catch (dbError) {
                console.error('Payout DB error:', dbError);
                return res.status(500).json({ success: false, msg: 'Failed to create payout record' });
            }

            // Phase 2: Execute Stripe transfer (idempotency key = payoutTx.id)
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

                return res.status(200).json({
                    success: true,
                    msg: `Rs. ${payoutAmount.toLocaleString()} transferred to your bank account.`,
                    stripeTransferId: transfer.id,
                });

            } catch (stripeError) {
                // Phase 2 failed: roll back DB deduction
                console.error('Stripe payout failed, rolling back DB:', stripeError.message);
                await prisma.$transaction([
                    prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: payoutAmount } } }),
                    prisma.walletTransaction.delete({ where: { id: payoutTx.id } })
                ]);
                return res.status(502).json({
                    success: false,
                    msg: 'Stripe transfer failed. Wallet balance has been restored.',
                    stripeError: stripeError.message,
                });
            }
        } catch (error) {
            console.error('substractSaleRevenueFromSalesman error:', error);
            return res.status(500).json({ success: false, msg: 'Payout failed', error: error.message });
        }
    }

    addRefundSatlmentsToSalesman = async (req, res) => {
        try {
            const { salesmanWalletID, amount, transactionID } = req.body;
            const safeAmount = parseFloat(amount);
            
            if (isNaN(safeAmount) || safeAmount <= 0) {
                return res.status(400).json({ msg: 'Invalid amount provided', error: true, status: 400 });
            }

            const transaction = await prisma.walletTransaction.findUnique({
                where: { id: transactionID }
            });
            
            if (!transaction) return res.status(404).json({ msg: 'Transaction not found', error: true, status: 404 });

            const order = await prisma.order.findUnique({
                where: { id: transaction.orderId }
            });
            
            if (!order || order.status !== 'DELIVERED') {
                return res.status(400).json({ msg: 'Order is not delivered', error: true, status: 400 });
            }

            const adminWallet = await getAdminWallet();
            await prisma.$transaction([
                prisma.wallet.update({ where: { id: salesmanWalletID }, data: { balance: { decrement: safeAmount } } }),
                prisma.wallet.update({ where: { id: adminWallet.id }, data: { balance: { increment: safeAmount } } }),
                prisma.walletTransaction.create({
                    data: {
                        amount: safeAmount,
                        type: "REFUND_SETTLEMENT",
                        senderWalletId: salesmanWalletID,
                        receiverWalletId: adminWallet.id,
                        orderId: transaction.orderId,
                        description: "Refund settlement: salesman returns funds to admin"
                    }
                })
            ]);
            
            return res.status(200).json({ msg: 'Refund settlement added successfully', error: false, status: 200 });
        } catch (error) {
            console.error("Adding refund settlement error:", error);
            return res.status(500).json({ msg: 'walletController --> addRefundSatlmentsToSalesman: Failed to add refund settlement', error: true, status: 500 });
        }
    }
}

export default new WalletController();