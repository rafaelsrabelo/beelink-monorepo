// Prisma CLI config — read by `prisma generate` and `prisma migrate`, never by the running API,
// which gets DATABASE_URL through src/shared/config/env.ts.
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { defineConfig } from 'prisma/config';

expand(config({ quiet: true }));

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Not prisma's env(): it throws when the variable is unset, and `prisma generate` — which build,
  // type-check and test all run — needs no database. A migration fails on the empty URL instead.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
