import prisma from '../lib/prisma.js';

class WalletController {

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

            await prisma.$transaction([
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
                        type: "REFUND",
                        senderWalletId: salesmanWalletId,
                        receiverWalletId: walletID,
                        orderId: orderId,
                        codSettlementStatus: "PENDING",
                        description: "Admin approved refund"
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

            await prisma.$transaction([
                prisma.wallet.update({
                    where: { id: walletID },
                    data: { balance: { increment: safeAmount } }
                }),
                prisma.walletTransaction.create({
                    data: {
                        amount: safeAmount,
                        type: "EARNING",
                        senderWalletId: null,
                        receiverWalletId: walletID,
                        orderId: orderId,
                        codSettlementStatus: "NOT_APPLICABLE",
                        description: "Earnings from completed delivery"
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
                    data: { balance: { decrement: safeAmount } }
                }),
                prisma.wallet.update({
                    where: { id: salespersonWalletID },
                    data: { balance: { increment: safeAmount } }
                }),
                prisma.walletTransaction.create({
                    data: {
                        amount: safeAmount,
                        type: "COD_PAYMENT",
                        senderWalletId: deliveryWalletID,
                        receiverWalletId: salespersonWalletID,
                        orderId: orderId,
                        codSettlementStatus: "PENDING",
                        description: "COD payment collected from customer"
                    }
                })
            ]);

            return res.status(200).json({ msg: 'COD payment subtracted successfully', error: false, status: 200 });
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

            await prisma.$transaction([
                prisma.walletTransaction.update({
                    where: { id: transactionId },
                    data: { codSettlementStatus: 'SETTLED' }
                }),
                prisma.wallet.update({
                    where: { id: deliveryWalletID },
                    data: { balance: { increment: transaction.amount } }
                }),
                prisma.walletTransaction.create({
                    data: {
                        amount: transaction.amount,
                        type: "COD_REMITTANCE",
                        senderWalletId: deliveryWalletID,
                        receiverWalletId: salespersonWalletID,
                        orderId: transaction.orderId,
                        codSettlementStatus: "SETTLED",
                        description: "COD settlement finalized"
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

            await prisma.$transaction([
                prisma.wallet.update({
                    where: { id: salesmanWalletID },
                    data: { balance: { increment: safeAmount } }
                }),
                prisma.walletTransaction.create({
                    data: {
                        amount: safeAmount,
                        type: "SALE_EARNING",
                        senderWalletId: null,
                        receiverWalletId: salesmanWalletID,
                        orderId: orderId,
                        codSettlementStatus: "NOT_APPLICABLE",
                        description: "Earnings from completed sale"
                    }
                })
            ]);

            return res.status(200).json({ msg: 'Purchase amount added to Salesman successfully', error: false, status: 200 });
        } catch (error) {
            console.error("Adding purchase amount error:", error);
            return res.status(500).json({ msg: 'walletController --> addPurchaseAmountToSalesman: Failed to add purchase amount', error: true, status: 500 });
        }
    }

    substractSaleRevenueFromSalesman = async (req, res) => {
        try {
            const { salesmanWalletID } = req.body;
            const wallet = await prisma.wallet.findUnique({
                where: { id: salesmanWalletID }
            });
            
            if (!wallet) return res.status(404).json({ msg: 'Salesman wallet not found', error: true, status: 404 });
            if (wallet.balance <= 0) return res.status(400).json({ msg: 'Insufficient balance', error: true, status: 400 });

            const payoutAmount = wallet.balance;

            await prisma.$transaction([
                prisma.wallet.update({
                    where: { id: salesmanWalletID },
                    data: { balance: { decrement: payoutAmount } }
                }),
                prisma.walletTransaction.create({
                    data: {
                        amount: payoutAmount,
                        type: "PAYOUT",
                        senderWalletId: salesmanWalletID,
                        receiverWalletId: null,
                        codSettlementStatus: "NOT_APPLICABLE",
                        description: "Revenue payout to Salesman bank account"
                    }
                })
            ]);

            return res.status(200).json({ msg: 'Sale revenue subtracted from Salesman successfully', error: false, status: 200 });
        } catch (error) {
            console.error("Subtracting sale revenue error:", error);
            return res.status(500).json({ msg: 'walletController --> substractSaleRevenueFromSalesman: Failed to subtract sale revenue', error: true, status: 500 });
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

            await prisma.$transaction([
                prisma.wallet.update({
                    where: { id: salesmanWalletID },
                    data: { balance: { increment: safeAmount } }
                }),
                prisma.walletTransaction.create({
                    data: {
                        amount: safeAmount,
                        type: "REFUND_SETTLEMENT",
                        senderWalletId: null,
                        receiverWalletId: salesmanWalletID,
                        orderId: transaction.orderId,
                        codSettlementStatus: "NOT_APPLICABLE",
                        description: "Refund settlement added to Salesman wallet"
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