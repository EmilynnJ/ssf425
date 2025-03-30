import { ApiError, Client, Environment } from 'square';

export const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
  environment: process.env.NODE_ENV === 'production' 
    ? Environment.Production 
    : Environment.Sandbox
});

// Application ID and Location ID will be used on the frontend
export const squareConfig = {
  applicationId: process.env.SQUARE_APPLICATION_ID || '',
  locationId: process.env.SQUARE_LOCATION_ID || ''
};

// Function to create a payment for a reading session
export async function createReaderPayment(
  amount: number, // in cents
  sourceName: string, // who is paying (client name)
  readerId: number, // reader receiving payment
  readingId: number, // ID of the reading session
  idempotencyKey: string // unique key to prevent duplicate payments
) {
  try {
    const response = await squareClient.paymentsApi.createPayment({
      sourceId: 'CASH', // We'll use cash payments for internal tracking
      idempotencyKey,
      amountMoney: {
        amount: BigInt(amount),
        currency: 'USD'
      },
      note: `Payment for reading session #${readingId} with reader #${readerId}`,
      customerId: sourceName,
      locationId: squareConfig.locationId,
      autocomplete: true
    });
    
    return {
      success: true,
      paymentId: response.result.payment?.id,
      amount: response.result.payment?.amountMoney?.amount
    };
  } catch (error) {
    console.error('Error creating Square payment:', error);
    return {
      success: false,
      error: error
    };
  }
}

// Function to create a product purchase
export async function createProductPurchase(
  amount: number, // in cents
  customerId: number,  // ID of the customer
  orderId: number, // ID of the order
  productName: string, // Name of the product being purchased
  idempotencyKey: string // unique key to prevent duplicate payments
) {
  try {
    const response = await squareClient.paymentsApi.createPayment({
      sourceId: 'CASH', // We'll use cash payments for internal tracking 
      idempotencyKey,
      amountMoney: {
        amount: BigInt(amount),
        currency: 'USD'
      },
      note: `Payment for product purchase: ${productName} (Order #${orderId})`,
      customerId: customerId.toString(),
      locationId: squareConfig.locationId,
      autocomplete: true
    });
    
    return {
      success: true,
      paymentId: response.result.payment?.id,
      amount: response.result.payment?.amountMoney?.amount
    };
  } catch (error) {
    console.error('Error creating Square product payment:', error);
    return {
      success: false,
      error: error
    };
  }
}