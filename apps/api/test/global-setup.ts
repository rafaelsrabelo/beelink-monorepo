// Node
import { execFileSync } from 'node:child_process';

// Libs
import pg from 'pg';

// App
import { TEST_DATABASE_URL } from './support/test-database.js';

/**
 * Runs once, before any e2e file: creates the test database when it is missing — a Postgres init
 * script would only run on an empty volume — then applies every migration to it.
 */
export default async function setup(): Promise<void> {
  const database = new URL(TEST_DATABASE_URL).pathname.slice(1);
  const maintenance = new URL(TEST_DATABASE_URL);
  maintenance.pathname = '/postgres';

  const client = new pg.Client({ connectionString: maintenance.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (rowCount === 0) {
      await client.query(`CREATE DATABASE "${database}"`);
    }
  } finally {
    await client.end();
  }

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
