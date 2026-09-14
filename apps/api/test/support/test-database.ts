/** The e2e suites' own database. CI points TEST_DATABASE_URL at its service container. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://harness:harness@localhost:5432/harness_test';
