import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { sql } from '../database'; // Assuming sql is now exported from database.ts
import { log } from '../vite';

// ES Module alternative for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a table to track migrations if it doesn't exist
const createMigrationsTableQuery = `
  CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

// Get all migrations that have been applied
const getAppliedMigrationsQuery = `
  SELECT name FROM migrations ORDER BY id ASC;
`;

// Insert a migration record
const insertMigrationQuery = `
  INSERT INTO migrations (name) VALUES ($1);
`;

// Read and execute migration files
export async function runMigrations() {
  try {
    // Create migrations table if it doesn't exist
    await sql`${createMigrationsTableQuery}`;
    log('Migrations table created or verified', 'database');

    // Get all applied migrations
    const appliedMigrations = await sql`${getAppliedMigrationsQuery}`;
    const appliedMigrationNames = appliedMigrations.rows.map(row => row.name);

    // Get all migration files
    const migrationsDir = path.join(__dirname);
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure order by filename

    // Check which migrations need to be applied
    const pendingMigrations = migrationFiles.filter(file => !appliedMigrationNames.includes(file));

    if (pendingMigrations.length === 0) {
      log('No pending migrations to apply', 'database');
      return;
    }

    log(`Found ${pendingMigrations.length} pending migrations`, 'database');

    // Begin a transaction
    try {
      await sql`BEGIN`;

      // Apply each pending migration
      for (const migrationFile of pendingMigrations) {
        const migrationPath = path.join(migrationsDir, migrationFile);
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        log(`Applying migration: ${migrationFile}`, 'database');
        await sql`${migrationSql}`;
        await sql`${insertMigrationQuery}`, [migrationFile];
        log(`Successfully applied migration: ${migrationFile}`, 'database');
      }

      // Commit transaction
      await sql`COMMIT`;
      log(`Successfully applied ${pendingMigrations.length} migrations`, 'database');
    } catch (error) {
      // Rollback transaction on error
      await sql`ROLLBACK`;
      log(`Error applying migrations: ${error}`, 'database');
      throw error;
    }
  } catch (error) {
    log(`Migration error: ${error}`, 'database');
    throw error;
  }
}

// Run a specific migration manually
export async function runMigration(migrationName: string, migrationSql: string) {
  try {
    // Create migrations table if it doesn't exist
    await sql`${createMigrationsTableQuery}`;
    log('Migrations table created or verified', 'database');

    // Check if migration has been applied
    const appliedMigrations = await sql`${getAppliedMigrationsQuery}`;
    const appliedMigrationNames = appliedMigrations.rows.map(row => row.name);

    if (appliedMigrationNames.includes(migrationName)) {
      log(`Migration ${migrationName} already applied, skipping`, 'database');
      return;
    }

    // Begin a transaction
    try {
      await sql`BEGIN`;

      // Apply the migration
      log(`Applying migration: ${migrationName}`, 'database');
      await sql`${migrationSql}`;
      await sql`${insertMigrationQuery}`, [migrationName];
      log(`Successfully applied migration: ${migrationName}`, 'database');

      // Commit transaction
      await sql`COMMIT`;
    } catch (error) {
      // Rollback transaction on error
      await sql`ROLLBACK`;
      log(`Error applying migration ${migrationName}: ${error}`, 'database');
      throw error;
    }
  } catch (error) {
    log(`Migration error: ${error}`, 'database');
    throw error;
  }
}

// Export a function to run migrations when server starts
export async function initializeDatabase() {
  try {
    log('Initializing database...', 'database');
    await runMigrations();
    log('Database initialization complete', 'database');
  } catch (error) {
    log(`Database initialization error: ${error}`, 'database');
    throw error;
  }
}