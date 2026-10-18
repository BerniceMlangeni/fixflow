import app, { initializeDatabase } from './app.js';
import { pool } from './db.js';

const PORT = Number(process.env.PORT) || 3000;

async function startServer(): Promise<void> {
  try {
    await initializeDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`FixFlow API running on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      'Failed to initialize FixFlow:',
      error instanceof Error ? error.message : error
    );

    await pool.end();
    process.exitCode = 1;
  }
}

void startServer();