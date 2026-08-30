// Initialize Stripe with the Secret Key
import Stripe from 'stripe';
import prisma from '../lib/prisma.js';
import { getAdminWallet, ensureWallet } from '../lib/adminWallet.js';
import { buildOrderPlan, splitWalletAmount } from '../lib/orderPricing.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const hasValidCoordinates = (latitude, longitude) => {
    if (latitude === null || latitude === undefined || String(latitude).trim() === ''
        || longitude === null || longitude === undefined || String(longitude).trim() === '') {
        return false;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    return Number.isFinite(lat) && Number.isFinite(lng)
        && lat >= -90 && lat <= 90
        && lng >= -180 && lng <= 180;
};

const formatDeliveryAddress = (address) => [
    address?.street,
    address?.city,
    address?.state,
    address?.postalCode,
    address?.country,
].filter(Boolean).join(', ');

/**
 * Pure service function — creates a Stripe Express connected account.
 * Safe to call from any controller without req/res.
 */
export const createStripeAccountForSalesman = async (opts = {}) => {
    const account = await stripe.accounts.create({ type: 'express' });
    const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: opts.refreshUrl || 'http://localhost:3000/reauth',
        return_url: opts.returnUrl || 'http://localhost:3000/dashboard',
        type: 'account_onboarding',
    });
    return { accountId: account.id, onboardingUrl: accountLink.url };
};

class StripeController {
    stripeTest = async (req, res) => {
        try {
            // Attempt to retrieve the platform's main account details
            const account = await stripe.account.retrieve();
            
            res.status(200).json({
                success: true,
                message: "Stripe is successfully connected!",
                accountId: account.id,
                accountSettings: account.settings.dashboard
            });
        } catch (error) {
            console.error("Stripe Connection Error:", error.message);
            res.status(500).json({
                success: false,
                message: "Failed to connect to Stripe.",
                error: error.message
            });
        }
    }

    createConnectedAccount = async (req, res) => {
        try {
            console.log("Creating connected account with Stripe...");
            const { refreshUrl, returnUrl } = req.body || {};
            const result = await createStripeAccountForSalesman({ refreshUrl, returnUrl });
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            console.error("Error creating connected account:", error.message);
            res.status(500).json({
                success: false,
                message: "Failed to create onboarding session.",
                error: error.message
            });
        }
    }

    getOnboardingLink = async (req, res) => {
        try {
            // Salesmen don't have wallet access, so they can't onboard a payout account.
            if (req.user?.role === 'SALESMAN') {
                return res.status(403).json({ success: false, message: 'Salesmen do not have wallet access. Contact your shop manager.' });
            }
            const userId = req.user.id;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });
            
            let accountId = user.stripeAccountId;
            if (!accountId) {
                const account = await stripe.accounts.create({ type: 'express' });
                accountId = account.id;
                await prisma.user.update({ where: { id: userId }, data: { stripeAccountId: accountId } });
            }
            
            const { refreshUrl, returnUrl } = req.body || {};
            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: refreshUrl || 'http://localhost:8081',
                return_url: returnUrl || 'http://localhost:8081',
                type: 'account_onboarding',
            });
            
            res.status(200).json({ success: true, onboardingUrl: accountLink.url });
        } catch (error) {
            console.error("Error creating onboarding link:", error.message);
            res.status(500).json({ success: false, message: "Failed to create onboarding session.", error: error.message });
        }
    }

    checkAccountStatus = async (req, res) => {
        try {
            if (req.user?.role === 'SALESMAN') {
                return res.status(200).json({ success: true, isReady: false });
            }
            const userId = req.user.id;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user || !user.stripeAccountId) {
                 return res.status(200).json({ success: true, isReady: false });
            }
            let isReady = false;
            try {
                const account = await stripe.accounts.retrieve(user.stripeAccountId);
                isReady = account.charges_enabled;
            } catch (stripeErr) {
                // A stored connected-account id this platform key can't retrieve
                // (stale id, wrong key, or Connect not enabled) just means the
                // manager can't withdraw yet — report "not ready" rather than a 500
                // that would break the whole wallet screen.
                console.warn(`account-status: could not retrieve ${user.stripeAccountId}: ${stripeErr.message}`);
            }
            res.status(200).json({ success: true, isReady });
        } catch (error) {
            console.error("Error checking account status:", error.message);
            res.status(500).json({ success: false, message: "Failed to check account status.", error: error.message });
        }
    }

    createCheckoutSession = async (req, res) => {
        try {
            const { items, addressId, successUrl, cancelUrl } = req.body;
            const userID = req.user.id;
            const userRole = String(req.user.role || 'customer').toLowerCase();
            const requestedWalletAmount = Math.max(0, Number(req.body.walletAmount) || 0);

            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Your cart is empty.',
                });
            }

            if (!addressId) {
                return res.status(400).json({
                    success: false,
                    message: 'Please add and select a delivery address before payment.',
                });
            }

            const address = await prisma.address.findFirst({
                where: {
                    id: addressId,
                    userId: userID,
                },
                select: {
                    id: true,
                    street: true,
                    city: true,
                    state: true,
                    postalCode: true,
                    country: true,
                    latitude: true,
                    longitude: true,
                },
            });

            if (!address) {
                return res.status(400).json({
                    success: false,
                    message: 'The selected delivery address is invalid.',
                });
            }

            if (!hasValidCoordinates(address.latitude, address.longitude)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please edit the selected delivery address and pin its location before payment.',
                });
            }

            // Price the cart through the shared planner so the amount Stripe
            // charges (subtotal + 10% service charge + delivery fee, minus the
            // wallet-funded slice) matches exactly what the COD path would total.
            let plan;
            try {
                plan = await buildOrderPlan({
                    prisma,
                    items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
                    address,
                });
            } catch (planErr) {
                if (planErr?.status) {
                    return res.status(planErr.status).json({ success: false, message: planErr.message });
                }
                throw planErr;
            }
            const grandTotal = plan.grandTotal;

            // Wallet-funded slice — clamped to the order total and to the
            // customer's current balance. The remainder is what Stripe bills.
            let walletAmount = Math.min(requestedWalletAmount, grandTotal);
            if (walletAmount > 0) {
                const customerWallet = await prisma.wallet.findUnique({ where: { userId: userID } });
                if (!customerWallet || customerWallet.balance < walletAmount) {
                    return res.status(400).json({
                        success: false,
                        message: 'Insufficient wallet balance for the amount you chose to pay from your wallet.',
                    });
                }
            }

            const remainder = Math.round((grandTotal - walletAmount) * 100) / 100;
            if (remainder <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Your wallet covers the full total — use the wallet payment option instead.',
                });
            }

            const line_items = [{
                price_data: {
                    currency: 'lkr',
                    product_data: {
                        name: walletAmount > 0 ? 'Digifix Order (remaining balance)' : 'Digifix Order',
                    },
                    unit_amount: Math.round(remainder * 100),
                },
                quantity: 1,
            }];

            // Use URLs passed from the mobile app (dynamically resolved) or fall back to env var
            const EXPO_HOST = process.env.EXPO_HOST || '192.168.43.171';
            const resolvedSuccessUrl = successUrl || `exp://${EXPO_HOST}:8081/--/(customer)/checkout-success?session_id={CHECKOUT_SESSION_ID}`;
            const resolvedCancelUrl = cancelUrl || `exp://${EXPO_HOST}:8081/--/(customer)/cart`;

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: line_items,
                mode: 'payment',
                
                metadata: {
                    userID: userID,
                    userRole: userRole,
                    addressId: address.id,
                    walletAmount: String(walletAmount),
                    cartSummary: JSON.stringify(items.map(i => ({ productId: i.productId, itemType: i.itemType || 'PRODUCT', quantity: i.quantity })))
                },

                payment_intent_data: {
                    transfer_group: `ORDER_${userID}_${userRole}`, 
                },
                // Stripe will automatically redirect the user to these deep links
                success_url: resolvedSuccessUrl,
                cancel_url: resolvedCancelUrl,
            });
            
            console.log("Checkout session created with metadata:", session.metadata);
            
            res.json({ url: session.url });
        } catch (error) {
            console.error("Stripe Checkout Error:", error);
            res.status(500).json({ error: error.message });
        }
    };

    verifyPaymentAndSaveOrder = async (req, res) => {
        try {
            const { sessionId } = req.params;
            const customerId = req.user.id;

            const session = await stripe.checkout.sessions.retrieve(sessionId);

            if (session.payment_status !== 'paid') {
                return res.json({ success: false, message: 'Payment not completed.' });
            }

            const { cartSummary, addressId, userID } = session.metadata || {};
            const metadataWalletAmount = Math.max(0, Number(session.metadata?.walletAmount) || 0);
            if (userID !== customerId) {
                return res.status(403).json({
                    success: false,
                    message: 'This payment session does not belong to the signed-in customer.',
                });
            }

            if (!cartSummary || !addressId) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment session is missing delivery information.',
                });
            }

            // Idempotency: the success screen can re-mount and call this twice.
            // Every completed session leaves a DEPOSIT txn tagged with the
            // session id — if it exists, just return the order we already made.
            const alreadyProcessed = await prisma.walletTransaction.findFirst({
                where: { sourceRef: sessionId },
                select: { orderId: true },
            });
            if (alreadyProcessed) {
                return res.json({ success: true, status: 'paid', orderId: alreadyProcessed.orderId });
            }

            const address = await prisma.address.findFirst({
                where: {
                    id: addressId,
                    userId: customerId,
                },
                select: {
                    id: true,
                    street: true,
                    city: true,
                    state: true,
                    postalCode: true,
                    country: true,
                    latitude: true,
                    longitude: true,
                },
            });
            if (!address) {
                return res.status(400).json({
                    success: false,
                    message: 'The delivery address for this payment is no longer available.',
                });
            }

            if (!hasValidCoordinates(address.latitude, address.longitude)) {
                return res.status(400).json({
                    success: false,
                    message: 'The delivery address needs a pinned location before this order can be completed.',
                });
            }

            const parsedItems = JSON.parse(cartSummary);

            // Price the order through the shared planner so totals (subtotal +
            // 10% service charge + per-shop delivery fee) match the COD path.
            let plan;
            try {
                plan = await buildOrderPlan({
                    prisma,
                    items: parsedItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
                    address,
                });
            } catch (planErr) {
                if (planErr?.status) {
                    return res.status(planErr.status).json({ success: false, message: planErr.message });
                }
                throw planErr;
            }
            const { products, carParts, groupedBySeller, feeByShop, deliveryFee, grandTotal } = plan;

            // Wallet slice actually available now (Option A — the wallet is only
            // debited here, after the card payment has succeeded). If the balance
            // dropped since checkout started, clamp and warn.
            let walletAmount = Math.min(metadataWalletAmount, grandTotal);
            if (walletAmount > 0) {
                const customerWallet = await prisma.wallet.findUnique({ where: { userId: customerId } });
                const available = customerWallet?.balance ?? 0;
                if (available < walletAmount) {
                    console.warn(
                        `[stripe verify] wallet slice clamped for customer ${customerId}: ` +
                        `wanted ${walletAmount}, only ${available} available (session ${sessionId})`
                    );
                    walletAmount = Math.max(0, available);
                }
            }
            const stripePaid = Math.round((grandTotal - walletAmount) * 100) / 100;

            const timestamp = Date.now().toString(36).toUpperCase();
            const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
            const orderPrefix = `ORD-${timestamp}-${randomPart}`;

            const deliveryAddressSnapshot = formatDeliveryAddress(address);
            const deliveryLat = Number(address.latitude);
            const deliveryLng = Number(address.longitude);

            const sellerEntries = Object.entries(groupedBySeller);
            const orderTotals = sellerEntries.map(
                ([sellerId, g]) => g.subtotal + g.serviceCharge + (feeByShop.get(sellerId) || 0)
            );
            const walletSlices = splitWalletAmount(walletAmount, orderTotals);

            const createdOrders = await prisma.$transaction(async (tx) => {
                const orders = [];
                let orderIndex = 1;

                for (const [sellerId, sellerGroup] of sellerEntries) {
                    const orderNumber = sellerEntries.length > 1
                        ? `${orderPrefix}-${orderIndex}`
                        : orderPrefix;

                    const order = await tx.order.create({
                        data: {
                            orderNumber,
                            customerId,
                            salesmanId: sellerId,
                            addressId: address.id,
                            deliveryAddress: deliveryAddressSnapshot,
                            deliveryLatitude: deliveryLat,
                            deliveryLongitude: deliveryLng,
                            subtotal: sellerGroup.subtotal,
                            serviceCharge: sellerGroup.serviceCharge,
                            deliveryFee: feeByShop.get(sellerId) || 0,
                            total: orderTotals[orderIndex - 1],
                            walletAmount: walletSlices[orderIndex - 1] || 0,
                            status: 'PENDING',
                            paymentStatus: 'PAID',
                            paymentMethod: 'Stripe',
                            items: {
                                create: sellerGroup.items.map(i => ({
                                    quantity: i.quantity,
                                    price: i.price,
                                    total: i.total,
                                    itemName: i.name,
                                    itemType: i.itemType,
                                    ...(i.itemType === 'CAR_PART'
                                        ? { carPartId: i.productId }
                                        : { productId: i.productId }),
                                })),
                            },
                        },
                    });

                    await tx.orderTracking.create({
                        data: { orderId: order.id, status: 'PENDING', description: 'Order placed' },
                    });

                    orders.push(order);
                    orderIndex++;
                }

                // Decrement stock now that the orders exist.
                for (const it of parsedItems) {
                    if (products.find(p => p.id === it.productId)) {
                        await tx.product.update({
                            where: { id: it.productId },
                            data: { stock: { decrement: it.quantity } },
                        });
                    } else if (carParts.find(c => c.id === it.productId)) {
                        await tx.carPart.update({
                            where: { id: it.productId },
                            data: { stock: { decrement: it.quantity } },
                        });
                    }
                }

                const adminWallet = await getAdminWallet(tx);

                // Wallet-funded slice: customer -> admin (PURCHASE).
                if (walletAmount > 0) {
                    const customerWallet = await ensureWallet(customerId, tx);
                    await tx.wallet.update({
                        where: { id: customerWallet.id },
                        data: { balance: { decrement: walletAmount } },
                    });
                    await tx.wallet.update({
                        where: { id: adminWallet.id },
                        data: { balance: { increment: walletAmount } },
                    });
                    await tx.walletTransaction.create({
                        data: {
                            amount: walletAmount,
                            type: 'PURCHASE',
                            senderWalletId: customerWallet.id,
                            receiverWalletId: adminWallet.id,
                            orderId: orders[0]?.id,
                            description: `Partial wallet payment for order ${orderPrefix}`,
                        },
                    });
                }

                // Card-funded slice: Stripe (external) -> admin (DEPOSIT).
                // `sourceRef = sessionId` makes this the idempotency marker.
                await tx.wallet.update({
                    where: { id: adminWallet.id },
                    data: { balance: { increment: stripePaid } },
                });
                await tx.walletTransaction.create({
                    data: {
                        amount: stripePaid,
                        type: 'DEPOSIT',
                        senderWalletId: null,
                        receiverWalletId: adminWallet.id,
                        orderId: orders[0]?.id,
                        sourceRef: sessionId,
                        description: `Stripe payment received for ${orders.length} order(s)`,
                    },
                });

                return orders;
            }, { maxWait: 10000, timeout: 30000 });

            res.json({ success: true, status: 'paid', orderId: createdOrders[0]?.id });

        } catch (error) {
            // A racing second call loses the unique `sourceRef` — treat as success.
            if (error?.code === 'P2002') {
                const existing = await prisma.walletTransaction.findFirst({
                    where: { sourceRef: req.params.sessionId },
                    select: { orderId: true },
                });
                if (existing) {
                    return res.json({ success: true, status: 'paid', orderId: existing.orderId });
                }
            }
            console.error("Verification & DB Save Error:", error);
            res.status(500).json({ error: error.message });
        }
    };
}

export default new StripeController();
