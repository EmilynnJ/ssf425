import { neon, neonConfig } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { log } from './vite';

// Load environment variables
config();

// Configure neon
neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.POSTGRES_URL || '');

// Create a wrapper for compatibility
const query = async (text: string, params?: any[]) => {
  try {
    const start = Date.now();
    const result = await sql(text, params);
    const duration = Date.now() - start;
    
    log(`Executed query: ${text} - Duration: ${duration}ms`, 'database');
    
    return { rows: result, rowCount: result.length };
  } catch (error: any) {
    console.error('Database query error:', error);
    throw new Error(`Database query error: ${error.message}`);
  }
};

// Test the database connection
pool.connect()
  .then((client) => {
    log('PostgreSQL database connection established successfully', 'database');
    client.release();
  })
  .catch((err) => {
    log(`Error connecting to PostgreSQL database: ${err.message}`, 'database');
    console.error('Database connection error:', err);
  });

// Helper function to run a query with error handling
export async function query(text: string, params?: any[]) {
  try {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    log(`Executed query: ${text} - Duration: ${duration}ms - Rows: ${result.rowCount}`, 'database');
    
    return result;
  } catch (error: any) {
    console.error('Database query error:', error);
    throw new Error(`Database query error: ${error.message}`);
  }
}

// Get a client from the pool for transactions
export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  return client;
}

// Export pool for use in other modules
export { pool };