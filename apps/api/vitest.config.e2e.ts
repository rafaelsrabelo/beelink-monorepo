import { defineConfig } from 'vitest/config';

import { TEST_DATABASE_URL } from './test/support/test-database.js';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.e2e-spec.ts'],
    // TRUNCATE locks every table: two files at once would wipe each other's rows.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    globalSetup: ['./test/global-setup.ts'],
    // Set explicitly: env.ts would otherwise fill DATABASE_URL from apps/api/.env — the dev database.
    env: { NODE_ENV: 'test', LOG_LEVEL: 'silent', DATABASE_URL: TEST_DATABASE_URL },
  },
});
