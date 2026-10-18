
import { pool } from './db.js';

async function testDatabaseConnection(): Promise<void> {
  try {
    const result = await pool.query(
      'SELECT NOW() AS database_time'
    );

    console.log('Database connection successful!');
    console.log('Database time:', result.rows[0].database_time);
  } catch (error) {
    console.error(
      'Database connection failed:',
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void testDatabaseConnection();
