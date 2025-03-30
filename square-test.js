// This is a simple test file to explore the Square SDK API structure
import pkg from 'square';

// Log the Square package structure
console.log('Square package structure:');
console.log(Object.keys(pkg));

// Initialize the Square client - use SquareClient constructor
const client = new pkg.SquareClient({
  accessToken: 'fake-token',
  environment: pkg.SquareEnvironment.Sandbox
});

// Log the client structure
console.log('Client properties:');
console.log(Object.getOwnPropertyNames(client));

// Get the client's prototype
console.log('\nClient prototype methods:');
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client)));

// Attempt to access API properties
console.log('\nAccessing API properties on client:');
try {
  console.log('client.checkout:', client.checkout !== undefined);
  console.log('client.catalog:', client.catalog !== undefined);
  console.log('client.orders:', client.orders !== undefined);
  console.log('client.payments:', client.payments !== undefined);
  console.log('client.inventory:', client.inventory !== undefined);
} catch (e) {
  console.log('Error accessing properties:', e.message);
}