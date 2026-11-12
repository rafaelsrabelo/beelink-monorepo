// Nest
import { ConflictException, NotFoundException } from '@nestjs/common';

// Types
import type { AffiliateStatusDetails } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { EarningParts } from '../cashback/cashback-earning.js';

// App
import { env } from '../../shared/config/env.js';
import { brasiliaDayOf, dateColumnOf } from '../billing/billing-dates.js';
import { payoutPeriodOf } from './affiliate-payout-calendar.js';
import { commissionOf, zeroed } from './affiliate-commission.js';
import { lockAffiliate, recountAffiliate } from './affiliate-ledger.js';
import { AFFILIATE_PROGRAM_DEFAULTS, UUID, affiliateError } from './affiliates.constants.js';

type Tx = Prisma.TransactionClient;

const DAY_MS = 24 * 60 * 60 * 1000;
/** A browser's clock may run ahead of ours. */
const CLOCK_SKEW_MS = 5 * 60_000;

/**
 * What an order does to the commission of the affiliate it was credited to (IMPULSEIA-106), inside
 * the transaction that places or moves it — as `cashback-orders.ts` does to a customer's credit. One
 * commission per order, its key the order's: every step locks the affiliate and reads the commission
 * again before it moves it, so the second of two moves at once finds nothing to do.
 */

/** The visit as a validated body named it; null when it named none, or not one. */
export interface PlacedAffiliateVisit {
  affiliateId: string;
  visitedAt: Date;
}

export function placedAffiliateVisitOf(sent: { affiliateId: string | null; visitedAt: string | null } | undefined): PlacedAffiliateVisit | null {
  return sent?.affiliateId && sent.visitedAt ? { affiliateId: sent.affiliateId, visitedAt: new Date(sent.visitedAt) } : null;
}

/** The affiliate an order placed now is credited to, with what working out the commission needs. */
export interface Attribution {
  affiliateId: string;
  /** Null when the shopkeeper chose the affiliate (IMPULSEIA-107): no visit brought the order. */
  visitedAt: Date | null;
  email: string;
  phone: string | null;
  tableName: string;
  defaultRateBps: number;
}

/**
 * Whether the visit credits its affiliate, now (decision 7): links live in this deployment, the
 * affiliate this shop's and `ACTIVE`, the programme on, and the visit inside the programme's days.
 * Anything else is null — the order goes in with no affiliate, and nobody is told: the customer has
 * nothing to do with it.
 */
export async function attributionOf(tx: Tx, storeId: string, visit: PlacedAffiliateVisit | null, now: Date): Promise<Attribution | null> {
  if (!env.AFFILIATE_LINKS_ENABLED || !visit || visit.visitedAt.getTime() > now.getTime() + CLOCK_SKEW_MS) return null;

  const affiliate = await tx.affiliate.findFirst({
    where: { id: visit.affiliateId, storeId, status: 'ACTIVE' },
    select: { id: true, email: true, phone: true, table: { select: { name: true, defaultRateBps: true } }, store: { select: { affiliateProgram: { select: { enabled: true, attributionDays: true } } } } },
  });
  const program = affiliate?.store.affiliateProgram;
  if (!affiliate || !program?.enabled || now.getTime() - visit.visitedAt.getTime() > program.attributionDays * DAY_MS) return null;

  return {
    affiliateId: affiliate.id,
    visitedAt: new Date(Math.min(visit.visitedAt.getTime(), now.getTime())),
    email: affiliate.email,
    phone: affiliate.phone,
    tableName: affiliate.table.name,
    defaultRateBps: affiliate.table.defaultRateBps,
  };
}

const attributionSelect = {
  id: true,
  status: true,
  email: true,
  phone: true,
  table: { select: { name: true, defaultRateBps: true } },
  store: { select: { affiliateProgram: { select: { enabled: true } } } },
} as const satisfies Prisma.AffiliateSelect;

/**
 * The affiliate the shopkeeper names for an order (IMPULSEIA-107) — a sale registered in the panel, or
 * an order moved to them. Unlike a link's visit, a choice that cannot credit is refused aloud: the
 * shopkeeper asked for it. It credits only where a link would — links live, the programme on, the
 * affiliate this shop's and `ACTIVE` — since the buyer's name reaches the affiliate either way.
 */
export async function chosenAttributionOf(tx: Tx, storeId: string, affiliateId: string): Promise<Attribution> {
  const affiliate = UUID.test(affiliateId) ? await tx.affiliate.findFirst({ where: { id: affiliateId, storeId }, select: attributionSelect }) : null;
  if (!affiliate) throw new NotFoundException(affiliateError('AFFILIATE_NOT_FOUND', 'No such affiliate in this shop'));
  if (!env.AFFILIATE_LINKS_ENABLED || !affiliate.store.affiliateProgram?.enabled) {
    throw new ConflictException(affiliateError('AFFILIATE_ATTRIBUTION_CLOSED', 'Orders are not credited to affiliates here now'));
  }
  if (affiliate.status !== 'ACTIVE') {
    throw new ConflictException(affiliateError<AffiliateStatusDetails>('AFFILIATE_STATUS_INVALID', `Not credited while ${affiliate.status}`, { status: affiliate.status }));
  }
  return { affiliateId: affiliate.id, visitedAt: null, email: affiliate.email, phone: affiliate.phone, tableName: affiliate.table.name, defaultRateBps: affiliate.table.defaultRateBps };
}

/**
 * Placed: the commission is worked out at the affiliate's table as it is now, and waits on the
 * delivery. An own purchase — the customer's e-mail or phone the affiliate's — owes nothing and tells
 * nobody; any other owes the affiliate the e-mail of the sale.
 */
export async function holdOrderCommission(
  tx: Tx,
  order: { storeId: string; orderId: string; customerId: string; contactEmail: string | null; attribution: Attribution; parts: EarningParts; productIds: readonly (string | null)[] },
): Promise<void> {
  const { attribution } = order;
  await lockAffiliate(tx, attribution.affiliateId);

  const table = await tx.affiliate.findUniqueOrThrow({ where: { id: attribution.affiliateId }, select: { tableId: true } });
  // A product deleted since the order — moved to an affiliate later — pays the table's rate.
  const products = order.productIds.filter((id): id is string => id !== null);
  const own = await tx.commissionTableRate.findMany({ where: { tableId: table.tableId, productId: { in: products } }, select: { productId: true, rateBps: true } });
  const worked = commissionOf(order.parts, order.productIds, { defaultRateBps: attribution.defaultRateBps, byProduct: new Map(own.map((rate) => [rate.productId, rate.rateBps])) });

  // The e-mail typed at a purchase without an account, else the account's; the phone of the customer's record.
  const customer = await tx.customer.findUniqueOrThrow({ where: { id: order.customerId }, select: { phone: true, user: { select: { email: true } } } });
  const ownPurchase = isOwnPurchase(attribution, { email: order.contactEmail ?? customer.user?.email ?? null, phone: customer.phone });
  const commission = ownPurchase ? zeroed(worked) : worked;
  const items = await tx.orderItem.findMany({ where: { orderId: order.orderId }, orderBy: { position: 'asc' }, select: { id: true } });

  await tx.affiliateCommission.create({
    data: {
      orderId: order.orderId,
      storeId: order.storeId,
      affiliateId: attribution.affiliateId,
      baseCents: commission.baseCents,
      commissionCents: commission.commissionCents,
      tableName: attribution.tableName,
      zeroReason: ownPurchase ? 'OWN_PURCHASE' : null,
      lines: { create: items.map((item, index) => ({ orderItemId: item.id, ...commission.lines[index]! })) },
    },
  });
  if (!ownPurchase) await tx.affiliateSaleNotice.create({ data: { orderId: order.orderId, kind: 'SALE' } });
  await recountAffiliate(tx, attribution.affiliateId);
}

/** The buyer is the affiliate: the same e-mail, or the same phone — both kept as digits with the country code. */
function isOwnPurchase(affiliate: { email: string; phone: string | null }, buyer: { email: string | null; phone: string | null }): boolean {
  const sameEmail = buyer.email !== null && buyer.email.trim().toLowerCase() === affiliate.email;
  const samePhone = buyer.phone !== null && affiliate.phone !== null && buyer.phone === affiliate.phone;
  return sameEmail || samePhone;
}

/** The order's commission, read again under its affiliate's lock; null when the order was credited to nobody. */
async function lockedCommissionOf(tx: Tx, orderId: string) {
  const found = await tx.affiliateCommission.findUnique({ where: { orderId }, select: { affiliateId: true } });
  if (!found) return null;
  await lockAffiliate(tx, found.affiliateId);
  return tx.affiliateCommission.findUnique({ where: { orderId } });
}

/**
 * Delivered: the commission falls in the payout period of today, in Brasília, and is due that
 * period's due day at the programme's delay as it is now (addendum A). `AffiliateCommissionSweeper`
 * makes it available that day. Answers the day; null when nothing waits.
 */
export async function dateOrderCommission(tx: Tx, orderId: string, now: Date): Promise<string | null> {
  const commission = await lockedCommissionOf(tx, orderId);
  if (commission?.status !== 'PENDING') return null;

  const program = await tx.affiliateProgram.findUnique({ where: { storeId: commission.storeId }, select: { payoutDelayDays: true } });
  // A programme is never deleted but with its shop; its default stands in should it be missing.
  const { dueOn } = payoutPeriodOf(brasiliaDayOf(now), program?.payoutDelayDays ?? AFFILIATE_PROGRAM_DEFAULTS.payoutDelayDays);
  await tx.affiliateCommission.update({ where: { orderId }, data: { dueOn: dateColumnOf(dueOn) } });
  return dueOn;
}

/**
 * The order left *delivered* (`BACK`) or was cancelled (`CANCELLED`). Pending, a cancelled commission
 * is undone for good and a commission whose order left *delivered* waits again, with no due day — a
 * new delivery gives it a new one. Already due, what it put on the statement is taken back by a line
 * of its own, which may take the balance below zero: the next payment is short by it. Undone, the
 * affiliate who was told of the sale is told of its cancellation.
 */
export async function revokeOrderCommission(tx: Tx, orderId: string, outcome: 'BACK' | 'CANCELLED', now: Date): Promise<void> {
  const commission = await lockedCommissionOf(tx, orderId);
  if (!commission || commission.status === 'REVERSED') return;

  if (commission.status === 'AVAILABLE' && commission.commissionCents > 0) {
    await tx.affiliateEntry.create({
      data: { storeId: commission.storeId, affiliateId: commission.affiliateId, kind: 'REVERSED', amountCents: -commission.commissionCents, orderId, createdAt: now },
    });
  }
  await tx.affiliateCommission.update({
    where: { orderId },
    data: outcome === 'CANCELLED' ? { status: 'REVERSED', dueOn: null, availableAt: null } : { status: 'PENDING', dueOn: null, availableAt: null },
  });
  if (outcome === 'CANCELLED' && commission.zeroReason === null) {
    await tx.affiliateSaleNotice.createMany({ data: [{ orderId, kind: 'CANCELLED' }], skipDuplicates: true });
  }
  await recountAffiliate(tx, commission.affiliateId);
}
