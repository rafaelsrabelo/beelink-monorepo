import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts'],
    // env.ts validates at import. Unit tests never connect, but they import modules that import it.
    env: { DATABASE_URL: 'postgresql://test:test@localhost:5432/test' },
    coverage: {
      provider: 'v8',
      // Vitest 4 counts only the files a test imported unless told otherwise — an untested file would be invisible.
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/main.ts', 'src/**/*.spec.ts'],
    },
  },
});
