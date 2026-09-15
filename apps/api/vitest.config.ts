import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts'],
    // env.ts validates at import, so every required variable has to be here. Unit tests never
    // connect or sign anything; a machine with no .env (CI) must still be able to run them.
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      JWT_SECRET: 'a-unit-test-secret-with-at-least-32-characters',
    },
    coverage: {
      provider: 'v8',
      // Vitest 4 counts only the files a test imported unless told otherwise — an untested file would be invisible.
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/main.ts', 'src/**/*.spec.ts'],
    },
  },
});
