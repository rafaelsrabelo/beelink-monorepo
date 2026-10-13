// The seed `prisma db seed` runs (`migrations.seed` in prisma.config.ts): every file of platform
// data, in order, each through `prisma db execute --file`.
//
// A script and not a line of the config: Prisma runs the configured command without a shell — it is
// split on its spaces and executed — so `one && two` is not a thing it can be given, and
// `db execute` takes one file. Plain JavaScript because nothing here compiles TypeScript outside
// `src` (see store-categories.sql).
//
// Each file is an upsert that never deletes, so the whole of it is safe to repeat: the `migrate`
// container runs it on every deploy. dev-catalog.sql is not platform data and is not listed.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const FILES = ['prisma/seed/store-categories.sql', 'prisma/seed/plans.sql'];

// The CLI's own entry, resolved from here and run with this Node: no PATH to depend on.
const prisma = createRequire(import.meta.url).resolve('prisma/build/index.js');

for (const file of FILES) {
  // A file that fails throws, which stops the run and the deploy with it.
  execFileSync(process.execPath, [prisma, 'db', 'execute', '--file', file], { stdio: 'inherit' });
}
