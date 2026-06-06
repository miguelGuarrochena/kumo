import Stripe from 'stripe';

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey && process.env.NODE_ENV === 'production') {
  throw new Error('STRIPE_SECRET_KEY required in production');
}

export const stripe = apiKey
  ? new Stripe(apiKey, { apiVersion: '2025-09-30.clover' })
  : null;

export const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY ?? '';
export const STRIPE_PRICE_YEARLY  = process.env.STRIPE_PRICE_YEARLY  ?? '';

export const isStripeConfigured = () => stripe !== null && STRIPE_PRICE_MONTHLY !== '';
