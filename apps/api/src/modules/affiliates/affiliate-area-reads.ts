// Types
import type { AffiliateNextPayment, AffiliateNumbers, AffiliateOrderPage, AffiliatePayoutPage, AffiliateProductPage, RouteVocabulary } from '@harness-monorepo/contracts';

// App
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import { brasiliaDayOf, dateColumnOf, dayOfDateColumn, daysAfter, openOfBrasiliaDay } from '../billing/billing-dates.js';
import { ROUTE_WORDS } from '../catalog/catalog.constants.js';
import { AFFILIATE_NUMBERS_DAYS } from './affiliates.constants.js';

/*
  What an affiliate reads of their own standing at a shop (IMPULSEIA-108), always by the standing's
  id — the service found it through the account, so nothing here can read another's. Of an order's
  customer, the name alone is selected: no query here names a phone, an e-mail, a document or an
  address, so no answer can carry one.
*/

type Page = { page: number; pageSize: number };

/** The last thirty days, today included, on Brasília's calendar. */
export async function numbersOf(prisma: PrismaService, affiliateId: string, now: Date): Promise<AffiliateNumbers> {
  const firstDay = daysAfter(brasiliaDayOf(now), -(AFFILIATE_NUMBERS_DAYS - 1));
  const since = openOfBrasiliaDay(firstDay);
  const placed = { affiliateId, order: { createdAt: { gte: since }, status: { not: 'CANCELLED' as const } } };

  const [visits, orders, sales, commission] = await Promise.all([
    prisma.affiliateVisitDay.aggregate({ where: { affiliateId, day: { gte: dateColumnOf(firstDay) } }, _sum: { visits: true } }),
    prisma.affiliateCommission.count({ where: placed }),
    prisma.affiliateCommission.count({ where: { ...placed, order: { ...placed.order, status: 'DELIVERED' as const } } }),
    prisma.affiliateCommission.aggregate({ where: { ...placed, status: { not: 'REVERSED' } }, _sum: { commissionCents: true } }),
  ]);
  return { days: AFFILIATE_NUMBERS_DAYS, visits: visits._sum.visits ?? 0, orders, sales, commissionCents: commission._sum.commissionCents ?? 0 };
}

/** What is owed now, and the nearest day something else falls due. */
export async function nextPaymentOf(prisma: PrismaService, affiliateId: string, availableCents: number): Promise<AffiliateNextPayment> {
  const waiting = { affiliateId, status: 'PENDING' as const, dueOn: { not: null }, commissionCents: { gt: 0 } };
  const nearest = await prisma.affiliateCommission.findFirst({ where: waiting, orderBy: { dueOn: 'asc' }, select: { dueOn: true } });
  const dueOn = nearest?.dueOn ?? null;
  const due = dueOn ? await prisma.affiliateCommission.aggregate({ where: { ...waiting, dueOn }, _sum: { commissionCents: true } }) : null;

  return {
    availableCents: Math.max(0, availableCents),
    next: dueOn && due ? { dueOn: dayOfDateColumn(dueOn), amountCents: due._sum.commissionCents ?? 0 } : null,
  };
}

/** The orders credited to them, newest first: who bought by name, what, and the commission. */
export async function ordersOf(prisma: PrismaService, affiliateId: string, { page, pageSize }: Page): Promise<AffiliateOrderPage> {
  const [rows, total] = await Promise.all([
    prisma.affiliateCommission.findMany({
      where: { affiliateId },
      orderBy: { order: { number: 'desc' } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        status: true,
        baseCents: true,
        commissionCents: true,
        zeroReason: true,
        dueOn: true,
        order: {
          select: {
            number: true,
            createdAt: true,
            status: true,
            customer: { select: { name: true } },
            items: { orderBy: { position: 'asc' }, select: { productName: true, variantLabel: true, quantity: true } },
          },
        },
      },
    }),
    prisma.affiliateCommission.count({ where: { affiliateId } }),
  ]);

  return {
    orders: rows.map((row) => ({
      number: row.order.number,
      placedAt: row.order.createdAt.toISOString(),
      status: row.order.status,
      customerName: row.order.customer.name,
      items: row.order.items.map((item) => ({ name: item.productName, variantLabel: item.variantLabel, quantity: item.quantity })),
      commission: {
        status: row.status,
        baseCents: row.baseCents,
        commissionCents: row.commissionCents,
        zeroReason: row.zeroReason,
        dueOn: row.dueOn ? dayOfDateColumn(row.dueOn) : null,
      },
    })),
    total,
    page,
    pageSize,
  };
}

/** The payments the shop registered for them, the latest paid first. */
export async function payoutsOf(prisma: PrismaService, affiliateId: string, { page, pageSize }: Page): Promise<AffiliatePayoutPage> {
  const [rows, total] = await Promise.all([
    prisma.affiliatePayout.findMany({
      where: { affiliateId },
      orderBy: [{ paidOn: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, amountCents: true, paidOn: true, method: true, note: true },
    }),
    prisma.affiliatePayout.count({ where: { affiliateId } }),
  ]);
  return { payouts: rows.map((row) => ({ ...row, paidOn: dayOfDateColumn(row.paidOn) })), total, page, pageSize };
}

/** Who the links are built for: the shop's address and words, and the affiliate's table and `/name`. */
export interface LinkOwner {
  storeId: string;
  storeSlug: string;
  routeVocabulary: RouteVocabulary;
  tableId: string;
  defaultRateBps: number;
  affiliateSlug: string;
}

/** The shop's products on the shelf, by name, each with the link that credits the affiliate and what it pays them. */
export async function productsOf(prisma: PrismaService, owner: LinkOwner, query: Page & { q: string | null }): Promise<AffiliateProductPage> {
  const where = { storeId: owner.storeId, status: 'ACTIVE' as const, ...(query.q ? { name: { contains: query.q, mode: 'insensitive' as const } } : {}) };
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        priceCents: true,
        images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
        commissionRates: { where: { tableId: owner.tableId }, select: { rateBps: true } },
        category: { select: { commissionRates: { where: { tableId: owner.tableId }, select: { rateBps: true } } } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const products = ROUTE_WORDS[owner.routeVocabulary].products;
  const credit = `?afiliado=${encodeURIComponent(owner.affiliateSlug)}`;
  return {
    products: rows.map((row) => ({
      productId: row.id,
      name: row.name,
      imageUrl: row.images[0]?.url ?? null,
      priceCents: row.priceCents,
      // The product's own, else its category's, else the table's — the order's own precedence (`rateOf`).
      rateBps: row.commissionRates[0]?.rateBps ?? row.category?.commissionRates[0]?.rateBps ?? owner.defaultRateBps,
      path: `/${owner.storeSlug}/${products}/${row.slug}${credit}`,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}
