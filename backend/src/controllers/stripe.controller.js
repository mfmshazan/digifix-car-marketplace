// Initialize Stripe with the Secret Key
import Stripe from 'stripe';
import prisma from '../lib/prisma.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
            const account = await stripe.accounts.create({
                type: 'express',
            });
            const accountLink = await stripe.accountLinks.create({
                account: account.id,
                refresh_url: 'http://localhost:3000/reauth', // URL to handle expired sessions
                return_url: 'http://localhost:3000/dashboard', // URL upon successful completion
                type: 'account_onboarding',
            });

            // 3. Send the URL back to the frontend
            res.status(200).json({
                success: true,
                accountId: account.id,
                onboardingUrl: accountLink.url
            });

        } catch (error) {
            console.error("Error creating connected account:", error.message);
            res.status(500).json({
                success: false,
                message: "Failed to create onboarding session.",
                error: error.message
            });
        }
    }

    createCheckoutSession = async (req, res) => {
        try {
            const { items, userID, userRole, successUrl, cancelUrl } = req.body;
            const line_items = items.map((item) => {
                return {
                    price_data: {
                        currency: 'lkr',
                        product_data: {
                            // Enforcing official template naming
                            name: `Digifix - ${item.name}`,
                        },
                        // Math.round is required to prevent decimal errors if prices have floating points
                        unit_amount: Math.round((item.discountPrice ? item.discountPrice : item.price) * 100),
                    },
                    quantity: item.quantity,
                };
            });

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

            const { cartSummary } = session.metadata;
            const parsedItems = JSON.parse(cartSummary);

            // Separate product IDs and car part IDs
            const productIds = parsedItems.filter(i => i.itemType !== 'CAR_PART').map(i => i.productId);
            const carPartIds = parsedItems.filter(i => i.itemType === 'CAR_PART').map(i => i.productId);

            const [products, carParts] = await Promise.all([
                productIds.length > 0
                    ? prisma.product.findMany({ where: { id: { in: productIds } } })
                    : Promise.resolve([]),
                carPartIds.length > 0
                    ? prisma.carPart.findMany({ where: { id: { in: carPartIds } } })
                    : Promise.resolve([]),
            ]);

            // Build unified item lookup: productId -> item info with sellerId
            const itemMap = {};
            products.forEach(p => { itemMap[p.id] = { ...p, sellerId: p.salesmanId, type: 'PRODUCT' }; });
            carParts.forEach(cp => { itemMap[cp.id] = { ...cp, type: 'CAR_PART' }; });

            // Group cart items by seller
            const groupedBySeller = {};
            for (const item of parsedItems) {
                const found = itemMap[item.productId];
                if (!found) continue;
                if (!groupedBySeller[found.sellerId]) {
                    groupedBySeller[found.sellerId] = { sellerId: found.sellerId, items: [] };
                }
                const price = found.discountPrice || found.price;
                groupedBySeller[found.sellerId].items.push({
                    productId: item.productId,
                    itemType: item.itemType || 'PRODUCT',
                    name: found.name,
                    quantity: item.quantity,
                    price,
                    total: price * item.quantity,
                });
            }

            // Create one order per seller
            const createdOrders = [];
            for (const sellerGroup of Object.values(groupedBySeller)) {
                const subtotal = sellerGroup.items.reduce((sum, i) => sum + i.total, 0);
                const order = await prisma.order.create({
                    data: {
                        customerId,
                        salesmanId: sellerGroup.sellerId,
                        subtotal,
                        total: subtotal,
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
                createdOrders.push(order);
            }

            res.json({ success: true, status: 'paid', orderId: createdOrders[0]?.id });

        } catch (error) {
            console.error("Verification & DB Save Error:", error);
            res.status(500).json({ error: error.message });
        }
    };
}

export default new StripeController();