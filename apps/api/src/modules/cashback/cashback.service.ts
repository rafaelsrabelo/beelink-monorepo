// Nest
import { Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { CashbackOverview, CustomerCashback } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { adjustCashback, spendableAt } from './cashback-ledger.js';
import { CASHBACK_EXPIRING_SOON_DAYS, CASHBACK_PAGE_SIZE, DAY_MS } from './cashback.constants.js';
import { toCashbackCredit, toCashbackEntry, toCashbackSettings } from './cashback.mapper.js';
import { spendingOrder } from './cashback-spending.js';
import type { CashbackAdjustmentDto, CashbackSettingsDto, CustomerCashbackQueryDto } from './dto/cashback.dto.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER_NUMBER = { order: { select: { number: true } } } as const;

/**
 * A shop's cashback as its owner keeps it (BEELINK-238): the rules, what they have run up, and each
 * customer's credit. What an order earns or spends is not decided here.
 */
@Injectable()
export class CashbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async overview(storeSlug: string, userId: string): Promise<CashbackOverview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return this.overviewOf(storeId);
  }

  /** The whole of the rules, as the form saves them. The lots already given keep their validity. */
  async save(storeSlug: string, userId: string, dto: CashbackSettingsDto): Promise<CashbackOverview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const rules = { enabled: dto.enabled, rateBps: dto.rateBps, expiresAfterDays: dto.expiresAfterDays, minSubtotalCents: dto.minSubtotalCents, maxRedeemBps: dto.maxRedeemBps };
    await this.prisma.cashbackSettings.upsert({ where: { storeId }, create: { storeId, ...rules }, update: rules });
    return this.overviewOf(storeId);
  }

  async customer(storeSlug: string, userId: string, customerId: string, query: CustomerCashbackQueryDto): Promise<CustomerCashback> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const id = await this.customerIdOf(storeId, customerId);
    return this.customerCashbackOf(id, query.page ?? 1, query.pageSize ?? CASHBACK_PAGE_SIZE);
  }

  /** The shopkeeper's correction, and the customer's credit after it — the first page of the statement, where it now stands. */
  async adjust(storeSlug: string, userId: string, customerId: string, dto: CashbackAdjustmentDto): Promise<CustomerCashback> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const id = await this.customerIdOf(storeId, customerId);
    await this.prisma.$transaction((tx) => adjustCashback(tx, { storeId, customerId: id, amountCents: dto.amountCents, reason: dto.reason, actorUserId: userId, now: new Date() }));
    return this.customerCashbackOf(id, 1, CASHBACK_PAGE_SIZE);
  }

  private async overviewOf(storeId: string): Promise<CashbackOverview> {
    // One instant for "soon", and the sums read from the customers' caches and the lots alike.
    const now = new Date();
    const soon = new Date(now.getTime() + CASHBACK_EXPIRING_SOON_DAYS * DAY_MS);

    const [settings, owed, expiring] = await Promise.all([
      this.prisma.cashbackSettings.findUnique({ where: { storeId } }),
      this.prisma.customer.aggregate({ where: { storeId }, _sum: { cashbackBalanceCents: true, cashbackPendingCents: true } }),
      this.prisma.cashbackCredit.aggregate({ where: { storeId, ...spendableAt(now), expiresAt: { gt: now, lte: soon } }, _sum: { remainingCents: true } }),
    ]);

    return {
      settings: toCashbackSettings(settings),
      owed: {
        availableCents: owed._sum.cashbackBalanceCents ?? 0,
        pendingCents: owed._sum.cashbackPendingCents ?? 0,
        expiringSoonCents: expiring._sum.remainingCents ?? 0,
        expiringSoonDays: CASHBACK_EXPIRING_SOON_DAYS,
      },
    };
  }

  private async customerCashbackOf(customerId: string, page: number, pageSize: number): Promise<CustomerCashback> {
    const now = new Date();
    const [customer, open, entries, total] = await Promise.all([
      this.prisma.customer.findUniqueOrThrow({ where: { id: customerId }, select: { cashbackBalanceCents: true, cashbackPendingCents: true } }),
      this.prisma.cashbackCredit.findMany({
        where: { customerId, OR: [{ status: 'PENDING' }, spendableAt(now)] },
        include: ORDER_NUMBER,
      }),
      this.prisma.cashbackEntry.findMany({
        where: { customerId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: ORDER_NUMBER,
      }),
      this.prisma.cashbackEntry.count({ where: { customerId } }),
    ]);

    // Usable lots in the order they will be spent, then what waits on a delivery.
    const available = spendingOrder(open.filter((lot) => lot.status === 'AVAILABLE'));
    const pending = open.filter((lot) => lot.status === 'PENDING').sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const first = available.find((lot) => lot.expiresAt !== null);
    const nextExpiry = first?.expiresAt
      ? {
          amountCents: available.filter((lot) => lot.expiresAt?.getTime() === first.expiresAt?.getTime()).reduce((sum, lot) => sum + lot.remainingCents, 0),
          expiresAt: first.expiresAt.toISOString(),
        }
      : null;

    return {
      balanceCents: customer.cashbackBalanceCents,
      pendingCents: customer.cashbackPendingCents,
      nextExpiry,
      credits: [...available, ...pending].map(toCashbackCredit),
      entries: entries.map(toCashbackEntry),
      total,
      page,
      pageSize,
    };
  }

  /** A customer of this shop's; another shop's, or none at all, is one answer. */
  private async customerIdOf(storeId: string, customerId: string): Promise<string> {
    const row = UUID.test(customerId) ? await this.prisma.customer.findFirst({ where: { id: customerId.toLowerCase(), storeId }, select: { id: true } }) : null;
    if (!row) throw new NotFoundException({ errorCode: 'CUSTOMER_NOT_FOUND', message: 'No such customer in this shop' });
    return row.id;
  }
}
