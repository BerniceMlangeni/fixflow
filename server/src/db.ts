
import 'dotenv/config';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});
