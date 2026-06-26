import Stripe from 'stripe';

let stripeClient;

export const getStripeClient = () => {
  if (stripeClient) return stripeClient;

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    const error = new Error('STRIPE_SECRET_KEY is not configured. Add it to backend/.env to use Stripe features.');
    error.status = 503;
    throw error;
  }

  stripeClient = new Stripe(apiKey);
  return stripeClient;
};
