// Test script for Square SDK
import { SquareClient } from 'square';

// Print Square SDK version
console.log('Square SDK version: v42.0.0'); // Known from npm list

// Create a client
const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN'
});

// Print the available API endpoints
console.log('Available API endpoints:');
console.log(Object.keys(client));

// Let's explore the checkout API
if (client.checkout) {
  console.log('\nCheckout API methods:');
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client.checkout)));
}

// Let's explore the catalog API
if (client.catalog) {
  console.log('\nCatalog API methods:');
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client.catalog)));
}

// Let's explore the payments API
if (client.payments) {
  console.log('\nPayments API methods:');
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client.payments)));
}

// Let's explore the orders API
if (client.orders) {
  console.log('\nOrders API methods:');
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client.orders)));
}

// Let's explore the inventory API
if (client.inventory) {
  console.log('\nInventory API methods:');
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client.inventory)));
}