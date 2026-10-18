
import 'dotenv/config';
import { Pool } from 'pg';

const isTest = process.env.NODE_ENV === 'test';

const connectionString = isTest
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    isTest
      ? 'TEST_DATABASE_URL is not configured.'
      : 'DATABASE_URL is not configured.'
  );
}

export const pool = new Pool({
  connectionString,
  ssl: isTest ? false : { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});
