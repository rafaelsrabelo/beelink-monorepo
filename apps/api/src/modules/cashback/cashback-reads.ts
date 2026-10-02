// Types
import type { CashbackCredit, CashbackEntry } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { spendableAt } from './cashback-ledger.js';
import { toCashbackCredit, toCashbackEntry } from './cashback.mapper.js';
import { spendingOrder } from './cashback-spending.js';

type Db = Pick<Prisma.TransactionClient, 'customer' | 'cashbackCredit' | 'cashbackEntry'>;

const ORDER_NUMBER = { order: { select: { number: true } } } as const;

/**
 * A customer's credit as it reads now: the balance and what is pending, the lots still worth
 * something — usable ones in the order they will be spent, then the ones waiting on a delivery — and
 * the soonest part of the balance to expire. The panel's reading and the customer's own copy of their
 * data share it, so the two never disagree.
 */
export async function creditsOf(
  db: Db,
  customerId: string,
  now: Date,
): Promise<{ balanceCents: number; pendingCents: number; credits: CashbackCredit[]; nextExpiry: { amountCents: number; expiresAt: string } | null }> {
  const customer = await db.customer.findUniqueOrThrow({ where: { id: customerId }, select: { cashbackBalanceCents: true, cashbackPendingCents: true } });
  const open = await db.cashbackCredit.findMany({ where: { customerId, OR: [{ status: 'PENDING', remainingCents: { gt: 0 } }, spendableAt(now)] }, include: ORDER_NUMBER });

  const available = spendingOrder(open.filter((lot) => lot.status === 'AVAILABLE'));
  const pending = open.filter((lot) => lot.status === 'PENDING').sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const soonest = available.find((lot) => lot.expiresAt !== null)?.expiresAt ?? null;

  return {
    balanceCents: customer.cashbackBalanceCents,
    pendingCents: customer.cashbackPendingCents,
    credits: [...available, ...pending].map(toCashbackCredit),
    nextExpiry: soonest && {
      amountCents: available.filter((lot) => lot.expiresAt?.getTime() === soonest.getTime()).reduce((sum, lot) => sum + lot.remainingCents, 0),
      expiresAt: soonest.toISOString(),
    },
  };
}

/** The statement, the newest first: one page of it, or the whole of it when no page is asked for. */
export async function entriesOf(db: Db, customerId: string, page?: { page: number; pageSize: number }): Promise<CashbackEntry[]> {
  const rows = await db.cashbackEntry.findMany({
    where: { customerId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(page ? { skip: (page.page - 1) * page.pageSize, take: page.pageSize } : {}),
    include: ORDER_NUMBER,
  });
  return rows.map(toCashbackEntry);
}
