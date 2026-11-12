// Types
import type { Prisma } from '../../generated/prisma/client.js';

type Tx = Prisma.TransactionClient;

/**
 * Every change to what a shop owes an affiliate goes through here (IMPULSEIA-106), inside the
 * transaction that makes it, after the affiliate's lock, and ends by reading the balances again from
 * what explains them — as a customer's cashback is kept. So the rule the statement rests on holds
 * whoever wrote last: `availableCents` is what the statement adds up to, and `pendingCents` what the
 * pending commissions do.
 *
 * The locks are taken shop → customer → affiliate → commission, the order a placement and a move of
 * an order already hold them in: anything that changes a commission locks its affiliate first, and
 * never takes the shop's row after it.
 */

/** The affiliate's row, held to the end of the transaction. */
export async function lockAffiliate(tx: Tx, affiliateId: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM "affiliates" WHERE "id" = ${affiliateId}::uuid FOR UPDATE`;
}

/** The two balances, read again from the commissions and the statement. Under the affiliate's lock. */
export async function recountAffiliate(tx: Tx, affiliateId: string): Promise<void> {
  const pending = await tx.affiliateCommission.aggregate({ where: { affiliateId, status: 'PENDING' }, _sum: { commissionCents: true } });
  const available = await tx.affiliateEntry.aggregate({ where: { affiliateId }, _sum: { amountCents: true } });
  await tx.affiliate.update({ where: { id: affiliateId }, data: { pendingCents: pending._sum.commissionCents ?? 0, availableCents: available._sum.amountCents ?? 0 } });
}
