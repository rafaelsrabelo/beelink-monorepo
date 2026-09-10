import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.e2e-spec.ts'],
    // The database is replaced in these tests; the URL only has to pass env.ts.
    env: { DATABASE_URL: 'postgresql://test:test@localhost:5432/test' },
  },
});
