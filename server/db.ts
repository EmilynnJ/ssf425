import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@shared/schema';

// Create a PostgreSQL pool using the DATABASE_URL environment variable
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Initialize Drizzle with the pool and schema
export const db = drizzle(pool, { schema });