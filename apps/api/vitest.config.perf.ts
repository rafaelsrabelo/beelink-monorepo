import { defineConfig } from 'vitest/config';

import e2e from './vitest.config.e2e.js';

/**
 * The storefront's performance measurements: seeded at scale and timed, so kept out of `ci-check`
 * and run on purpose with `pnpm --filter api perf:catalog`. Same setup as the e2e suites, against a
 * database of its own (the script names it), so a run never shares rows with them. Spread and not
 * `mergeConfig`, which would add the e2e files to `include` instead of replacing them.
 */
export default defineConfig({
  test: {
    ...e2e.test,
    include: ['test/perf/**/*.perf-spec.ts'],
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
