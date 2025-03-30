import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required environment variable: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export interface CreatePaymentIntentParams {
  amount: number;
  currency?: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export async function createPaymentIntent({
  amount,
  currency = 'usd',
  customerId,
  metadata = {},
}: CreatePaymentIntentParams) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      ...(customerId ? { customer: customerId } : {}),
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }
}

export async function updatePaymentIntent(
  paymentIntentId: string,
  updateData: {
    amount?: number;
    metadata?: Record<string, string>;
  }
) {
  try {
    const { amount, metadata } = updateData;
    const updateParams: Stripe.PaymentIntentUpdateParams = {};

    if (amount !== undefined) {
      updateParams.amount = Math.round(amount * 100); // Convert to cents
    }

    if (metadata) {
      updateParams.metadata = metadata;
    }

    const paymentIntent = await stripe.paymentIntents.update(
      paymentIntentId,
      updateParams
    );

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    };
  } catch (error: any) {
    console.error('Error updating payment intent:', error);
    throw new Error(`Failed to update payment intent: ${error.message}`);
  }
}

export async function capturePaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    return {
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100, // Convert from cents to dollars
      paymentIntentId: paymentIntent.id,
    };
  } catch (error: any) {
    console.error('Error capturing payment intent:', error);
    throw new Error(`Failed to capture payment intent: ${error.message}`);
  }
}

export async function createCustomer({
  email,
  name,
  metadata = {},
}: {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });
    return customer;
  } catch (error: any) {
    console.error('Error creating customer:', error);
    throw new Error(`Failed to create customer: ${error.message}`);
  }
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error: any) {
    console.error('Error retrieving payment intent:', error);
    throw new Error(`Failed to retrieve payment intent: ${error.message}`);
  }
}

export default {
  createPaymentIntent,
  updatePaymentIntent,
  capturePaymentIntent,
  createCustomer,
  retrievePaymentIntent,
};