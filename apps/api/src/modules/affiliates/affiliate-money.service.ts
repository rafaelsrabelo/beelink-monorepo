// Nest
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { AffiliateOwed, AffiliatePayoutExceedsDetails, AffiliateStatement, AffiliateStatusDetails } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { brasiliaDayOf, dateColumnOf, dayOfDateColumn } from '../billing/billing-dates.js';
import { StoresService } from '../stores/stores.service.js';
import { lockAffiliate, recountAffiliate } from './affiliate-ledger.js';
import { owedOf } from './affiliate-owed.js';
import { AFFILIATE_BALANCE_MAX_CENTS, AFFILIATE_STATEMENT_PAGE_SIZE, UUID, affiliateError } from './affiliates.constants.js';
import { toStatementEntry } from './affiliate-money.mapper.js';
import type { AffiliateAdjustmentDto, AffiliatePayoutDto, AffiliateStatementQueryDto } from './dto/affiliate-money.dto.js';

type Tx = Prisma.TransactionClient;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What a shop owes its affiliates, as its owner keeps the books (IMPULSEIA-107, decision 9 of the
 * epic): each one's balances and statement, the shop's adjustments and the payments it made outside
 * bee-link, and what it owes by due day. Nothing moves money here: a payout is the record of one.
 * Every write locks the affiliate first and reads the balances again after, as `affiliate-ledger.ts`
 * asks, and never takes the shop's row after the affiliate's.
 */
@Injectable()
export class AffiliateMoneyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async statement(storeSlug: string, userId: string, affiliateId: string, query: AffiliateStatementQueryDto): Promise<AffiliateStatement> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const affiliate = await this.affiliateOf(storeId, affiliateId);
    return this.statementOf(affiliate.id, query.page ?? 1, query.pageSize ?? AFFILIATE_STATEMENT_PAGE_SIZE);
  }

  /** The shop's correction, either way, with its reason — which the affiliate reads too. The balance may go below zero. */
  async adjust(storeSlug: string, userId: string, affiliateId: string, dto: AffiliateAdjustmentDto): Promise<AffiliateStatement> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const affiliate = await this.affiliateOf(storeId, affiliateId);
    if (affiliate.status === 'INVITED') throw statusRefused(affiliate.status);

    await this.prisma.$transaction(async (tx) => {
      const balance = await this.lockedBalanceOf(tx, affiliate.id);
      if (Math.abs(balance + dto.amountCents) > AFFILIATE_BALANCE_MAX_CENTS) {
        throw new BadRequestException(affiliateError('AFFILIATE_ADJUSTMENT_INVALID', 'The balance would pass its bound'));
      }
      await tx.affiliateEntry.create({ data: { storeId, affiliateId: affiliate.id, kind: 'ADJUSTED', amountCents: dto.amountCents, reason: dto.reason, actorId: userId } });
      await recountAffiliate(tx, affiliate.id);
    });
    return this.statementOf(affiliate.id, 1, AFFILIATE_STATEMENT_PAGE_SIZE);
  }

  /**
   * A payment made outside bee-link, recorded: up to what is available, on a day not after today. An
   * advance past the balance is an adjustment, with its reason (decision 9).
   */
  async payout(storeSlug: string, userId: string, affiliateId: string, dto: AffiliatePayoutDto): Promise<AffiliateStatement> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const affiliate = await this.affiliateOf(storeId, affiliateId);
    if (affiliate.status === 'INVITED') throw statusRefused(affiliate.status);
    const paidOn = paidOnOf(dto.paidOn, brasiliaDayOf(new Date()));

    await this.prisma.$transaction(async (tx) => {
      const availableCents = await this.lockedBalanceOf(tx, affiliate.id);
      if (dto.amountCents > availableCents) {
        throw new ConflictException(
          affiliateError<AffiliatePayoutExceedsDetails>('AFFILIATE_PAYOUT_EXCEEDS_BALANCE', 'More than is available', { availableCents: Math.max(0, availableCents) }),
        );
      }
      const payout = await tx.affiliatePayout.create({
        data: { storeId, affiliateId: affiliate.id, amountCents: dto.amountCents, paidOn: dateColumnOf(paidOn), method: dto.method, note: dto.note, createdById: userId },
      });
      await tx.affiliateEntry.create({ data: { storeId, affiliateId: affiliate.id, kind: 'PAID_OUT', amountCents: -dto.amountCents, payoutId: payout.id, actorId: userId } });
      await recountAffiliate(tx, affiliate.id);
    });
    return this.statementOf(affiliate.id, 1, AFFILIATE_STATEMENT_PAGE_SIZE);
  }

  /** What the shop owes, by due day, and each affiliate's part of it. */
  async owed(storeSlug: string, userId: string): Promise<AffiliateOwed> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const today = brasiliaDayOf(new Date());

    const affiliates = await this.prisma.affiliate.findMany({
      where: { storeId, OR: [{ availableCents: { not: 0 } }, { pendingCents: { gt: 0 } }] },
      select: { id: true, name: true, slug: true, status: true, pixKey: true, availableCents: true, pendingCents: true },
    });
    // Each owed affiliate's available commissions, latest due day first, only as far back as their
    // balance reaches: the books grow forever, what is owed does not.
    const available = await this.prisma.$queryRaw<{ affiliateId: string; dueOn: Date; commissionCents: number }[]>`
      SELECT "affiliateId", "dueOn", "commissionCents" FROM (
        SELECT c."affiliateId", c."dueOn", c."orderId", c."commissionCents", a."availableCents",
               SUM(c."commissionCents") OVER (PARTITION BY c."affiliateId" ORDER BY c."dueOn" DESC, c."orderId" DESC) - c."commissionCents" AS "before"
        FROM "affiliate_commissions" c
        JOIN "affiliates" a ON a."id" = c."affiliateId"
        WHERE c."storeId" = ${storeId}::uuid AND c."status" = 'AVAILABLE' AND c."commissionCents" > 0 AND c."dueOn" IS NOT NULL AND a."availableCents" > 0
      ) owed
      WHERE "before" < "availableCents"
      ORDER BY "affiliateId", "dueOn" DESC, "orderId" DESC`;
    const [upcoming, awaiting] = await Promise.all([
      this.prisma.affiliateCommission.findMany({ where: { storeId, status: 'PENDING', dueOn: { not: null }, commissionCents: { gt: 0 } }, select: { affiliateId: true, dueOn: true, commissionCents: true } }),
      this.prisma.affiliateCommission.aggregate({ where: { storeId, status: 'PENDING', dueOn: null }, _sum: { commissionCents: true } }),
    ]);

    return owedOf({
      today,
      affiliates,
      available: available.map((row) => ({ affiliateId: row.affiliateId, dueOn: dayOfDateColumn(row.dueOn), commissionCents: Number(row.commissionCents) })),
      upcoming: upcoming.map((row) => ({ affiliateId: row.affiliateId, dueOn: dayOfDateColumn(row.dueOn!), commissionCents: row.commissionCents })),
      awaitingDeliveryCents: awaiting._sum.commissionCents ?? 0,
    });
  }

  /** The balance as it stands under the affiliate's lock, which the write that follows keeps. */
  private async lockedBalanceOf(tx: Tx, affiliateId: string): Promise<number> {
    await lockAffiliate(tx, affiliateId);
    await recountAffiliate(tx, affiliateId);
    return (await tx.affiliate.findUniqueOrThrow({ where: { id: affiliateId }, select: { availableCents: true } })).availableCents;
  }

  private async statementOf(affiliateId: string, page: number, pageSize: number): Promise<AffiliateStatement> {
    const [affiliate, entries, total] = await Promise.all([
      this.prisma.affiliate.findUniqueOrThrow({ where: { id: affiliateId }, select: { pendingCents: true, availableCents: true } }),
      this.prisma.affiliateEntry.findMany({
        where: { affiliateId },
        // The order they were written in, newest first: a uuid(7) is the instant it was made.
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { order: { select: { number: true } }, payout: true },
      }),
      this.prisma.affiliateEntry.count({ where: { affiliateId } }),
    ]);
    return { pendingCents: affiliate.pendingCents, availableCents: affiliate.availableCents, entries: entries.map(toStatementEntry), total, page, pageSize };
  }

  /** An affiliate of this shop's; another shop's, or none at all, is one answer. */
  private async affiliateOf(storeId: string, affiliateId: string) {
    const row = UUID.test(affiliateId) ? await this.prisma.affiliate.findFirst({ where: { id: affiliateId, storeId }, select: { id: true, status: true } }) : null;
    if (!row) throw new NotFoundException(affiliateError('AFFILIATE_NOT_FOUND', 'No such affiliate in this shop'));
    return row;
  }
}

/** Someone still invited has no books: nothing was ever owed them. */
function statusRefused(status: AffiliateStatusDetails['status']): ConflictException {
  return new ConflictException(affiliateError<AffiliateStatusDetails>('AFFILIATE_STATUS_INVALID', `No books while ${status}`, { status }));
}

/** The day the shop paid: a real day of the calendar, and not after today. */
function paidOnOf(day: string, today: string): string {
  const invalid = () => new BadRequestException(affiliateError('AFFILIATE_PAYOUT_INVALID', 'The payout is dated on no day, or in the future'));
  if (!DAY.test(day) || day > today) throw invalid();
  try {
    dateColumnOf(day);
  } catch {
    throw invalid();
  }
  return day;
}
