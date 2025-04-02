import { neon, neonConfig } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { log } from './vite';

// Load environment variables
config();

// Configure neon
neonConfig.fetchConnectionCache = true;

// Initialize the database connection
const sql = neon(process.env.POSTGRES_URL || '');

// Create a query wrapper for compatibility
export const query = async (text: string, params?: any[]) => {
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
sql('SELECT 1')
  .then(() => {
    log('PostgreSQL database connection established successfully', 'database');
  })
  .catch((err) => {
    log(`Error connecting to PostgreSQL database: ${err.message}`, 'database');
    console.error('Database connection error:', err);
  });

export { sql };