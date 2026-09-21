// Prisma CLI config — read by `prisma generate` and `prisma migrate`, never by the running API,
// which gets DATABASE_URL through src/shared/config/env.ts.
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { defineConfig } from 'prisma/config';

expand(config({ quiet: true }));

export default defineConfig({
  // A folder, not a file: Prisma reads every *.prisma under it, so a new domain adds a file here
  // instead of contending for one.
  schema: 'prisma/schema',
  // `migrations.seed` is Prisma 7's home for the seed command; the `prisma.seed` key in package.json
  // is the Prisma 5/6 spelling and this version ignores it. `prisma migrate dev` and
  // `prisma migrate reset` run it, and `pnpm --filter api db:seed` runs it on its own. The script
  // upserts on slug, so repeating it is safe.
  migrations: {
    path: 'prisma/migrations',
    seed: 'prisma db execute --file prisma/seed/store-categories.sql',
  },
  // Not prisma's env(): it throws when the variable is unset, and `prisma generate` — which build,
  // type-check and test all run — needs no database. A migration fails on the empty URL instead.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
