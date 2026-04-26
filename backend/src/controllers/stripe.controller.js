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
            const { items, userID, userRole } = req.body;
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

            // EXPO GO FIX: Replace '192.168.X.X' with your computer's actual IPv4 address!
            // When building the real APK later, change 'exp://...' back to 'digifixapp://...'
            const LOCAL_IP = '192.168.43.171'; // <--- CHANGE THIS TO YOUR IP
            const successUrl = `exp://${LOCAL_IP}:8081/--/(customer)/checkout-success?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `exp://${LOCAL_IP}:8081/--/(customer)/cart`;

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: line_items,
                mode: 'payment',
                
                metadata: {
                    userID: userID,
                    userRole: userRole,
                    cartSummary: JSON.stringify(items.map(i => ({ id: i.id, qty: i.quantity }))) 
                },

                payment_intent_data: {
                    transfer_group: `ORDER_${userID}_${userRole}`, 
                },
                // Stripe will automatically redirect the user to these deep links
                success_url: successUrl,
                cancel_url: cancelUrl,
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

            const session = await stripe.checkout.sessions.retrieve(sessionId);

            if (session.payment_status !== 'paid') {
                return res.json({ success: false, message: 'Payment not completed.' });
            }

            // Note: If you don't actually have a "Transaction" model in your Prisma schema 
            // for stripe tracking, this will throw an error. It relies on the code you previously provided.
            const existingTx = await prisma.transaction.findFirst({
                where: { stripeSessionId: sessionId }
            });

            if (existingTx) {
                return res.json({ success: true, message: 'Order already processed.', orderId: existingTx.orderId });
            }

            const { userID, userRole, cartSummary } = session.metadata;
            const totalAmount = session.amount_total / 100;
            const parsedItems = JSON.parse(cartSummary); // Array of { id, qty, price... }

            // --- START PRISMA TRANSACTION ---
            const savedOrder = await prisma.$transaction(async (tx) => {
                
                // 1. Create the Order securely marked as PAID
                const newOrder = await tx.order.create({
                    data: {
                        customerId: userID, // Fixed relation to match schema (customerId instead of userId)
                        salesmanId: userID, // Fallback if needed, though createOrder handles this differently.
                        items: {
                            // Using standard relational connection if relying purely on this method
                        },
                        subtotal: totalAmount,
                        total: totalAmount,
                        status: 'PROCESSING', // Use your OrderStatus enum
                        paymentStatus: 'PAID',
                        paymentMethod: 'Stripe',
                    }
                });

                // 2. Create the Transaction record
                await tx.transaction.create({
                    data: {
                        orderId: newOrder.id,
                        userId: userID,
                        userRole: userRole,
                        stripeSessionId: session.id,
                        paymentIntentId: session.payment_intent,
                        amount: totalAmount,
                        currency: session.currency,
                        status: 'Success',
                    }
                });

                // Note: We DO NOT pay the salesman here. 
                // The money is held in escrow. It will be released in the Order Controller when Delivered.
                return newOrder;
            });
            // --- END PRISMA TRANSACTION ---

            res.json({ success: true, status: 'paid', orderId: savedOrder.id });

        } catch (error) {
            console.error("Verification & DB Save Error:", error);
            res.status(500).json({ error: error.message });
        }
    };
}

export default new StripeController();