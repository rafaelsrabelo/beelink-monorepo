// Types
import type { Prisma } from '../../generated/prisma/client.js';

/**
 * The customer's row, locked until the transaction ends. Every change that must see the record's
 * other rows as they are — the addresses' one default, a merge, the favourites' cap — takes it
 * first, so two of them on one customer wait for each other instead of both passing a check.
 *
 * `FOR NO KEY UPDATE` and not `FOR UPDATE`: it conflicts with itself, which is the point, but not
 * with the key-share a foreign key takes. A write under a product's lock that inserts a row naming
 * this customer — a favourite's notice, from a sale or a cancel — would otherwise wait on a like
 * that waits on that product: a deadlock.
 */
export async function lockCustomer(tx: Prisma.TransactionClient, customerId: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "customers" WHERE "id" = ${customerId}::uuid FOR NO KEY UPDATE`;
}
