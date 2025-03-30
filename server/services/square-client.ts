import { v4 as uuidv4 } from 'uuid';
import { SquareClient, SquareEnvironment } from 'square';

// Square config will be used on the frontend
export const squareConfig = {
  applicationId: process.env.SQUARE_APPLICATION_ID || '',
  locationId: process.env.SQUARE_LOCATION_ID || ''
};

// Configure Square client
const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN || '',
  environment: 'sandbox' // or 'production' for live mode
});

// Function to create a payment for a per-minute reading session
export async function createOnDemandReadingPayment(
  pricePerMinute: number, // in cents
  clientId: number, // ID of the client
  clientName: string, // Name of the client
  readerId: number, // ID of the reader
  readingId: number, // ID of the reading session
  readingType: string, // Type of reading (chat, phone, video)
  idempotencyKey: string = uuidv4() // unique key to prevent duplicate payments
) {
  try {
    // Format reading type for display
    const readingTypeFormatted = readingType.charAt(0).toUpperCase() + readingType.slice(1);
    
    // Generate a unique order ID
    const orderId = uuidv4();
    
    // Create a checkout payment link using Square API
    const response = await squareClient.checkout.createPaymentLink({
      idempotencyKey,
      checkoutOptions: {
        redirectUrl: `${process.env.BASE_URL || ''}/readings/${readingId}/start`,
        askForShippingAddress: false,
      },
      order: {
        locationId: squareConfig.locationId,
        customerId: clientId.toString(),
        referenceId: `reading-${readingId}`,
        lineItems: [
          {
            name: `${readingTypeFormatted} Reading - Pay Per Minute`,
            quantity: '1',
            note: `Pre-authorization for pay-per-minute reading. Reader: ${readerId}`,
            basePriceMoney: {
              amount: pricePerMinute * 10, // Charge for 10 minutes upfront
              currency: 'USD'
            }
          }
        ],
        metadata: {
          readingId: readingId.toString(),
          readerId: readerId.toString(),
          clientId: clientId.toString(),
          readingType,
          pricePerMinute: pricePerMinute.toString()
        }
      },
    });

    if (response.result.errors && response.result.errors.length > 0) {
      console.error('Square API error:', response.result.errors);
      return {
        success: false,
        error: response.result.errors[0]
      };
    }
    
    const paymentLink = response.result.paymentLink;
    
    return {
      success: true,
      paymentLinkId: paymentLink?.id || '',
      paymentLinkUrl: paymentLink?.url || '',
      qrCodeUrl: paymentLink?.qrCodeSummary?.qrCode?.url || '',
      pricePerMinute: pricePerMinute
    };
  } catch (error) {
    console.error('Error creating Square payment link for reading:', error);
    return {
      success: false,
      error: error
    };
  }
}

// Function to calculate and process payment for completed reading session
export async function processCompletedReadingPayment(
  readingId: number, // ID of the reading session
  readerId: number, // ID of the reader
  clientId: number, // ID of the client
  clientName: string, // Name of the client 
  durationMinutes: number, // Duration of the reading in minutes
  pricePerMinute: number, // Price per minute in cents
  idempotencyKey: string = uuidv4() // unique key to prevent duplicate payments
) {
  try {
    const totalAmount = durationMinutes * pricePerMinute;
    
    // Format reading details
    const readingOrderId = `reading-${readingId}-${idempotencyKey.substring(0, 8)}`;
    
    // Create an order using Square API
    const orderResponse = await squareClient.orders.createOrder({
      idempotencyKey,
      order: {
        locationId: squareConfig.locationId,
        customerId: clientId.toString(),
        referenceId: readingOrderId,
        lineItems: [
          {
            name: `Psychic Reading - ${durationMinutes} Minutes`,
            quantity: durationMinutes.toString(),
            basePriceMoney: {
              amount: pricePerMinute,
              currency: 'USD'
            },
            note: `Reader: ${readerId}`
          }
        ],
        metadata: {
          readingId: readingId.toString(),
          readerId: readerId.toString(),
          clientId: clientId.toString(),
          durationMinutes: durationMinutes.toString(),
          pricePerMinute: pricePerMinute.toString()
        }
      }
    });

    if (orderResponse.result.errors && orderResponse.result.errors.length > 0) {
      console.error('Square API error creating order:', orderResponse.result.errors);
      return {
        success: false,
        error: orderResponse.result.errors[0]
      };
    }
    
    const order = orderResponse.result.order;
    
    // Create a payment for the order
    const paymentResponse = await squareClient.payments.createPayment({
      idempotencyKey: `${idempotencyKey}-payment`,
      sourceId: 'EXTERNAL', // For manual entry
      amountMoney: {
        amount: totalAmount,
        currency: 'USD'
      },
      orderId: order.id,
      customerId: clientId.toString(),
      note: `Payment for ${durationMinutes}-minute reading with Reader #${readerId}`,
      statementDescriptionIdentifier: 'SOULSEER-READING'
    });
    
    if (paymentResponse.result.errors && paymentResponse.result.errors.length > 0) {
      console.error('Square API error creating payment:', paymentResponse.result.errors);
      return {
        success: false,
        error: paymentResponse.result.errors[0]
      };
    }
    
    const payment = paymentResponse.result.payment;
    
    return {
      success: true,
      orderId: order.id,
      paymentId: payment.id,
      totalAmount: totalAmount,
      durationMinutes: durationMinutes
    };
  } catch (error) {
    console.error('Error processing completed reading payment:', error);
    return {
      success: false,
      error: error
    };
  }
}

// Function to create a product purchase
export async function createProductPurchase(
  productId: string, // Square product ID
  quantity: number,
  customerId: number, // ID of the customer
  customerName: string, // Name of the customer
  idempotencyKey: string = uuidv4() // unique key to prevent duplicate payments
) {
  try {
    // First, retrieve the product details from Square catalog
    const productResponse = await squareClient.catalog.retrieveCatalogObject(productId);
    
    if (productResponse.result.errors && productResponse.result.errors.length > 0) {
      console.error('Square API error retrieving product:', productResponse.result.errors);
      return {
        success: false,
        error: productResponse.result.errors[0]
      };
    }
    
    const product = productResponse.result.object;
    const itemData = product?.itemData;
    
    if (!itemData) {
      return {
        success: false,
        error: { message: 'Product does not have item data' }
      };
    }
    
    // Get the product price
    const variations = itemData.variations;
    if (!variations || variations.length === 0) {
      return {
        success: false,
        error: { message: 'Product does not have price variations' }
      };
    }
    
    const priceVariation = variations[0];
    const priceMoney = priceVariation.itemVariationData?.priceMoney;
    
    if (!priceMoney) {
      return {
        success: false,
        error: { message: 'Product does not have price information' }
      };
    }
    
    // Create a checkout payment link using Square API
    const response = await squareClient.checkout.createPaymentLink({
      idempotencyKey,
      checkoutOptions: {
        redirectUrl: `${process.env.BASE_URL || ''}/orders/confirmation`,
        askForShippingAddress: true,
      },
      order: {
        locationId: squareConfig.locationId,
        customerId: customerId.toString(),
        lineItems: [
          {
            catalogObjectId: productId,
            quantity: quantity.toString(),
          }
        ],
        metadata: {
          customerId: customerId.toString(),
          customerName
        }
      },
    });

    if (response.result.errors && response.result.errors.length > 0) {
      console.error('Square API error:', response.result.errors);
      return {
        success: false,
        error: response.result.errors[0]
      };
    }
    
    const paymentLink = response.result.paymentLink;
    
    return {
      success: true,
      paymentLinkId: paymentLink?.id || '',
      paymentLinkUrl: paymentLink?.url || '',
      qrCodeUrl: paymentLink?.qrCodeSummary?.qrCode?.url || ''
    };
  } catch (error) {
    console.error('Error creating Square product payment link:', error);
    return {
      success: false,
      error: error
    };
  }
}

// Function to sync Square catalog with our local database
export async function syncSquareCatalog() {
  try {
    // Fetch the entire catalog from Square
    const catalogResponse = await squareClient.catalog.listCatalog(undefined, 'ITEM');
    
    if (catalogResponse.result.errors && catalogResponse.result.errors.length > 0) {
      console.error('Square API error retrieving catalog:', catalogResponse.result.errors);
      return {
        success: false,
        error: catalogResponse.result.errors[0]
      };
    }
    
    const objects = catalogResponse.result.objects || [];
    const products = [];
    
    // Process each catalog item
    for (const object of objects) {
      // Skip non-item objects
      if (object.type !== 'ITEM' || !object.itemData) {
        continue;
      }
      
      const itemData = object.itemData;
      
      // Skip items without variations or prices
      if (!itemData.variations || itemData.variations.length === 0) {
        continue;
      }
      
      // Get the first variation for pricing (we're assuming a simple product model)
      const variation = itemData.variations[0];
      const variationData = variation.itemVariationData;
      
      if (!variationData || !variationData.priceMoney) {
        continue;
      }
      
      // Get the price in cents
      const price = variationData.priceMoney.amount || 0;
      
      // Get the inventory count if available
      let stock = 0;
      try {
        const inventoryResponse = await squareClient.inventory.retrieveInventoryCount(
          variation.id,
          squareConfig.locationId
        );
        
        if (inventoryResponse.result.counts && inventoryResponse.result.counts.length > 0) {
          stock = parseInt(inventoryResponse.result.counts[0].quantity || '0', 10);
        }
      } catch (err) {
        console.warn(`Could not retrieve inventory for ${object.id}:`, err);
        // Continue processing even if inventory fails
      }
      
      // Construct product object
      const product = {
        squareId: object.id,
        name: itemData.name || 'Unnamed Product',
        description: itemData.description || '',
        price: price,
        imageUrl: itemData.imageUrl || '',
        category: itemData.categoryId || 'Uncategorized',
        stock: stock,
        featured: false // Default to false, we'll set this manually later
      };
      
      products.push(product);
    }
    
    return {
      success: true,
      products
    };
  } catch (error) {
    console.error('Error syncing Square catalog:', error);
    return {
      success: false,
      error
    };
  }
}