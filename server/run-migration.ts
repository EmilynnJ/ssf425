import * as migrations from './migrations/009_add_gifts';

async function runMigrations() {
  console.log('Running migrations...');
  try {
    await migrations.up();
    console.log('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();
