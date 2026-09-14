// App
import type { PrismaService } from '../../src/shared/prisma/prisma.service.js';

/** Empties every table. Refuses any database whose name does not end in `_test`. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const [row] = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
  if (!row?.db.endsWith('_test')) {
    throw new Error(`Refusing to truncate "${row?.db ?? 'unknown'}" — e2e runs only against a *_test database`);
  }

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;

  const list = tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
