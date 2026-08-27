import prisma from '../lib/prisma.js';
import { uploadReceiptFile, getReceiptViewUrl } from '../lib/r2.js';
import { ensureWallet } from '../lib/adminWallet.js';
import { emailService } from '../services/email/emailServiceFactory.js';
import { sendReceiptDecisionToUser } from '../lib/onesignal.js';

// Roles that can carry a negative (owed) wallet balance, grouped so the admin UI
// can flag each debtor as a salesperson or a delivery person.
const DELIVERY_ROLES = ['RIDER', 'DELIVERY_PARTNER', 'DELIVERY_PERSON'];
const SALES_ROLES = ['SALESMAN', 'SHOP_MANAGER'];
const DEBT_ROLES = [...SALES_ROLES, ...DELIVERY_ROLES];

const userTypeFor = (role) => {
    if (DELIVERY_ROLES.includes(role)) return 'DELIVERY_PERSON';
    if (SALES_ROLES.includes(role)) return 'SALESPERSON';
    return 'OTHER';
};

class ReceiptController {
    // Driver / salesman submits proof of repayment
    submitReceipt = async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, msg: 'A receipt file (PDF or image) is required' });
            }

            const amount = parseFloat(req.body.amount);
            if (isNaN(amount) || amount <= 0) {
                return res.status(400).json({ success: false, msg: 'Invalid amount' });
            }

            const wallet = await ensureWallet(req.user.id);
            const { key, fileType } = await uploadReceiptFile({
                buffer: req.file.buffer,
                mimeType: req.file.mimetype,
                originalName: req.file.originalname,
                userId: req.user.id,
            });

            const receipt = await prisma.debtReceipt.create({
                data: {
                    walletId: wallet.id,
                    amount,
                    fileKey: key,
                    fileType,
                    note: req.body.note || null,
                },
            });

            return res.status(201).json({ success: true, data: receipt });
        } catch (error) {
            console.error('submitReceipt error:', error);
            return res.status(500).json({ success: false, msg: 'Failed to submit receipt', error: error.message });
        }
    };

    // Driver / salesman views their own receipt history
    getMyReceipts = async (req, res) => {
        try {
            const wallet = await ensureWallet(req.user.id);
            const receipts = await prisma.debtReceipt.findMany({
                where: { walletId: wallet.id },
                orderBy: { createdAt: 'desc' },
            });
            const withUrls = await Promise.all(
                receipts.map(async (r) => ({ ...r, viewUrl: await getReceiptViewUrl(r.fileKey) }))
            );
            return res.json({ success: true, balance: wallet.balance, data: withUrls });
        } catch (error) {
            console.error('getMyReceipts error:', error);
            return res.status(500).json({ success: false, msg: 'Failed to load receipts', error: error.message });
        }
    };

    // Admin: list receipts submitted by users, optionally narrowed to one status.
    // Without a status this returns every receipt ever submitted.
    adminListReceipts = async (req, res) => {
        try {
            const requestedStatus = String(req.query.status || '').toUpperCase();
            const status = ['PENDING', 'APPROVED', 'REJECTED'].includes(requestedStatus) ? requestedStatus : undefined;

            const receipts = await prisma.debtReceipt.findMany({
                where: status ? { status } : undefined,
                include: {
                    wallet: {
                        include: {
                            user: {
                                select: { id: true, name: true, email: true, phone: true, role: true, stripeAccountId: true },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            const rows = await Promise.all(
                receipts.map(async (receipt) => ({
                    ...receipt,
                    amount: Number(receipt.amount || 0),
                    userType: userTypeFor(receipt.wallet?.user?.role),
                    wallet: {
                        id: receipt.wallet.id,
                        balance: receipt.wallet.balance,
                        user: receipt.wallet.user,
                    },
                    viewUrl: receipt.fileKey ? await getReceiptViewUrl(receipt.fileKey) : null,
                }))
            );

            return res.json({ success: true, data: rows });
        } catch (error) {
            console.error('adminListReceipts error:', error);
            return res.status(500).json({ success: false, msg: 'Failed to load receipts', error: error.message });
        }
    };

    // Admin: salespersons and delivery persons whose wallet balance is negative,
    // i.e. the people who still need to pay the platform back.
    adminListDebtors = async (req, res) => {
        try {
            const wallets = await prisma.wallet.findMany({
                where: {
                    balance: { lt: 0 },
                    user: { role: { in: DEBT_ROLES } },
                },
                include: {
                    user: {
                        select: { id: true, name: true, email: true, phone: true, role: true, stripeAccountId: true },
                    },
                    debtReceipts: {
                        where: { status: 'PENDING' },
                        select: { id: true, amount: true, createdAt: true },
                    },
                },
                orderBy: { balance: 'asc' },
            });

            const data = wallets.map((wallet) => ({
                walletId: wallet.id,
                balance: wallet.balance,
                dueAmount: Math.abs(wallet.balance),
                userType: userTypeFor(wallet.user.role),
                user: wallet.user,
                pendingReceiptCount: wallet.debtReceipts.length,
                pendingReceiptAmount: wallet.debtReceipts.reduce((sum, r) => sum + Number(r.amount || 0), 0),
                updatedAt: wallet.updatedAt,
            }));

            return res.json({
                success: true,
                data,
                summary: {
                    totalDue: data.reduce((sum, d) => sum + d.dueAmount, 0),
                    salespersons: data.filter((d) => d.userType === 'SALESPERSON').length,
                    deliveryPersons: data.filter((d) => d.userType === 'DELIVERY_PERSON').length,
                },
            });
        } catch (error) {
            console.error('adminListDebtors error:', error);
            return res.status(500).json({ success: false, msg: 'Failed to load debtors', error: error.message });
        }
    };

    // Admin: approve or reject
    adminReviewReceipt = async (req, res) => {
        try {
            const { id } = req.params;
            const { decision, rejectionReason } = req.body; // decision: 'APPROVE' | 'REJECT'

            const receipt = await prisma.debtReceipt.findUnique({
                where: { id },
                include: { wallet: { include: { user: true } } },
            });
            if (!receipt) return res.status(404).json({ success: false, msg: 'Receipt not found' });
            if (receipt.status !== 'PENDING') {
                return res.status(400).json({ success: false, msg: `Receipt already ${receipt.status.toLowerCase()}` });
            }

            if (decision === 'REJECT') {
                const updated = await prisma.debtReceipt.update({
                    where: { id },
                    data: { status: 'REJECTED', rejectionReason: rejectionReason || 'Not specified', reviewedBy: req.user.id, reviewedAt: new Date() },
                });

                const userEmail = receipt.wallet?.user?.email;
                const userId = receipt.wallet?.user?.id;
                if (userEmail) {
                    await emailService.send({
                        to: userEmail,
                        subject: 'Payment Receipt Rejected',
                        html: `
                            <h2>Your receipt was rejected</h2>
                            <p>Your repayment receipt for Rs. ${Number(receipt.amount).toLocaleString()} was rejected by the admin.</p>
                            <p><strong>Reason:</strong> ${rejectionReason || 'Not specified'}</p>
                            <p>Please upload a valid receipt and try again.</p>
                        `,
                        text: `Your repayment receipt for Rs. ${Number(receipt.amount).toLocaleString()} was rejected. Reason: ${rejectionReason || 'Not specified'}. Please upload a valid receipt and try again.`,
                    }).catch((emailError) => console.error('Receipt rejection email failed:', emailError.message));
                }

                if (userId) {
                    await sendReceiptDecisionToUser({
                        userId,
                        status: 'REJECTED',
                        amount: receipt.amount,
                        rejectionReason: rejectionReason || 'Not specified',
                    }).catch((pushError) => console.error('Receipt rejection push failed:', pushError.message));
                }

                return res.json({ success: true, data: updated });
            }

            if (decision === 'APPROVE') {
                const [updated] = await prisma.$transaction([
                    prisma.debtReceipt.update({
                        where: { id },
                        data: { status: 'APPROVED', reviewedBy: req.user.id, reviewedAt: new Date() },
                    }),
                    prisma.wallet.update({
                        where: { id: receipt.walletId },
                        data: { balance: { increment: receipt.amount } },
                    }),
                    prisma.walletTransaction.create({
                        data: {
                            amount: receipt.amount,
                            type: 'DEBT_REPAYMENT',
                            senderWalletId: null,
                            receiverWalletId: receipt.walletId,
                            sourceRef: `DEBT_RECEIPT_${receipt.id}`,
                            description: `Approved debt repayment receipt #${receipt.id}`,
                        },
                    }),
                ]);

                const userEmail = receipt.wallet?.user?.email;
                const userId = receipt.wallet?.user?.id;
                if (userEmail) {
                    await emailService.send({
                        to: userEmail,
                        subject: 'Payment Receipt Approved',
                        html: `
                            <h2>Payment accepted</h2>
                            <p>Your repayment receipt for Rs. ${Number(receipt.amount).toLocaleString()} has been approved.</p>
                            <p>The amount has been applied to your wallet and your balance has been updated.</p>
                        `,
                        text: `Your repayment receipt for Rs. ${Number(receipt.amount).toLocaleString()} was approved. The payment was accepted and your wallet balance was updated.`,
                    }).catch((emailError) => console.error('Receipt approval email failed:', emailError.message));
                }

                if (userId) {
                    await sendReceiptDecisionToUser({
                        userId,
                        status: 'APPROVED',
                        amount: receipt.amount,
                    }).catch((pushError) => console.error('Receipt approval push failed:', pushError.message));
                }

                return res.json({ success: true, data: updated });
            }

            return res.status(400).json({ success: false, msg: 'decision must be APPROVE or REJECT' });
        } catch (error) {
            console.error('adminReviewReceipt error:', error);
            return res.status(500).json({ success: false, msg: 'Failed to review receipt', error: error.message });
        }
    };
}

export default new ReceiptController();