// Types
import type { AffiliateStatement } from '@harness-monorepo/contracts';

// App
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import { toStatementEntry } from './affiliate-money.mapper.js';

/**
 * An affiliate's balances and a page of their statement, newest first — read alike by the shop
 * (IMPULSEIA-107) and by the affiliate (IMPULSEIA-108), who reads the shop's reasons too and never
 * who wrote a line.
 */
export async function statementOf(prisma: PrismaService, affiliateId: string, page: number, pageSize: number): Promise<AffiliateStatement> {
  const [affiliate, entries, total] = await Promise.all([
    prisma.affiliate.findUniqueOrThrow({ where: { id: affiliateId }, select: { pendingCents: true, availableCents: true } }),
    prisma.affiliateEntry.findMany({
      where: { affiliateId },
      // The order they were written in, newest first: a uuid(7) is the instant it was made.
      orderBy: { id: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { order: { select: { number: true } }, payout: true },
    }),
    prisma.affiliateEntry.count({ where: { affiliateId } }),
  ]);
  return { pendingCents: affiliate.pendingCents, availableCents: affiliate.availableCents, entries: entries.map(toStatementEntry), total, page, pageSize };
}
