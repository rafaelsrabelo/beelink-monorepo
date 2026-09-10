import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts'],
    // env.ts validates at import. Unit tests never connect, but they import modules that import it.
    env: { DATABASE_URL: 'postgresql://test:test@localhost:5432/test' },
  },
});
