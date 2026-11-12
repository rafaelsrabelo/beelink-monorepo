// Nest
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { AffiliateCommissionStatusDetails, OrderAffiliate } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { EarningParts } from '../cashback/cashback-earning.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { chosenAttributionOf, dateOrderCommission, holdOrderCommission } from './affiliate-orders.js';
import { lockAffiliate, recountAffiliate } from './affiliate-ledger.js';
import { affiliateError } from './affiliates.constants.js';
import { toOrderAffiliate } from './affiliate-money.mapper.js';
import type { OrderAffiliateDto } from './dto/affiliate-money.dto.js';

type Tx = Prisma.TransactionClient;

/** What an order is read with to work its commission out again: its photographed amounts, line by line. */
const changeSelect = {
  id: true,
  status: true,
  customerId: true,
  contactEmail: true,
  affiliateId: true,
  subtotalCents: true,
  discountCents: true,
  promotionDiscountCents: true,
  couponDiscountCents: true,
  couponKind: true,
  cashbackUsedCents: true,
  items: { orderBy: { position: 'asc' }, select: { productId: true, lineTotalCents: true, discountCents: true } },
  affiliate: { select: { id: true, name: true } },
} as const satisfies Prisma.OrderSelect;

type ChangedOrder = Prisma.OrderGetPayload<{ select: typeof changeSelect }>;

/**
 * The parts an order's commission is worked out from, as the order photographed them: each line after
 * its promotion, and what is left of `discountCents` past the promotions and the coupon is the hand
 * discount — the same parts `earningPartsOf` gave when it was placed.
 */
export function storedEarningPartsOf(order: Omit<ChangedOrder, 'id' | 'status' | 'customerId' | 'contactEmail' | 'affiliateId' | 'affiliate'>): EarningParts {
  return {
    lines: order.items.map((item) => ({ netCents: item.lineTotalCents - item.discountCents, rateBps: null })),
    subtotalCents: order.subtotalCents,
    promotionDiscountCents: order.promotionDiscountCents,
    couponDiscountCents: order.couponDiscountCents,
    couponKind: order.couponKind,
    manualDiscountCents: Math.max(0, order.discountCents - order.promotionDiscountCents - order.couponDiscountCents),
    cashbackUsedCents: order.cashbackUsedCents,
  };
}

/**
 * Whom a shop's order is credited to, as its owner reads and corrects it (IMPULSEIA-107, decision 7
 * of the epic): another affiliate, or nobody, while the order stands and its commission is pending.
 * Once available, a correction is an adjustment on the statement.
 */
@Injectable()
export class AffiliateOrderChangesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async read(storeSlug: string, userId: string, number: number): Promise<OrderAffiliate> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const order = await this.prisma.order.findUnique({ where: { storeId_number: { storeId, number } }, select: { id: true } });
    if (!order) throw orderMissing(number);
    return this.readOf(order.id);
  }

  /**
   * Under the shop's row lock, as a move of its status, so a delivery or a cancellation never lands in
   * between; then both affiliates, in the order of their ids, before the commission — the order of
   * locks every write of a commission keeps.
   */
  async change(storeSlug: string, userId: string, number: number, dto: OrderAffiliateDto): Promise<OrderAffiliate> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const orderId = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "stores" WHERE "id" = ${storeId}::uuid FOR UPDATE`;
      const order = await tx.order.findUnique({ where: { storeId_number: { storeId, number } }, select: changeSelect });
      if (!order) throw orderMissing(number);
      if (order.status === 'CANCELLED') throw new ConflictException(affiliateError('ORDER_CANCELLED', 'A cancelled order is credited to nobody'));
      if (dto.affiliateId === order.affiliateId) return order.id;

      const attribution = dto.affiliateId ? await chosenAttributionOf(tx, storeId, dto.affiliateId) : null;
      for (const id of [order.affiliateId, attribution?.affiliateId].filter((id): id is string => !!id).sort()) await lockAffiliate(tx, id);

      const commission = await tx.affiliateCommission.findUnique({ where: { orderId: order.id }, select: { status: true } });
      if (commission && commission.status !== 'PENDING') {
        throw new ConflictException(affiliateError<AffiliateCommissionStatusDetails>('AFFILIATE_COMMISSION_NOT_PENDING', 'Only a pending commission moves', { status: commission.status }));
      }

      await this.moveCommission(tx, storeId, order, attribution);
      await tx.affiliateAttributionChange.create({
        data: {
          orderId: order.id,
          storeId,
          fromAffiliateId: order.affiliate?.id ?? null,
          fromName: order.affiliate?.name ?? null,
          toAffiliateId: attribution?.affiliateId ?? null,
          toName: attribution ? (await tx.affiliate.findUniqueOrThrow({ where: { id: attribution.affiliateId }, select: { name: true } })).name : null,
          reason: dto.reason,
          actorId: userId,
        },
      });
      return order.id;
    });

    return this.readOf(orderId);
  }

  /**
   * A pending commission left no line on the statement, so it simply goes; the new one is worked out at
   * the new affiliate's table as it is now, like a placement, and an order already delivered is dated
   * by its delivery's day. The sale's e-mail is owed again, to whoever is credited now: it is read when
   * it goes, so one not sent yet never reaches the affiliate who lost the order.
   */
  private async moveCommission(tx: Tx, storeId: string, order: ChangedOrder, attribution: Awaited<ReturnType<typeof chosenAttributionOf>> | null): Promise<void> {
    await tx.affiliateCommission.deleteMany({ where: { orderId: order.id } });
    await tx.affiliateSaleNotice.deleteMany({ where: { orderId: order.id, kind: 'SALE' } });
    await tx.order.update({ where: { id: order.id }, data: { affiliateId: attribution?.affiliateId ?? null, affiliateVisitAt: null } });
    if (order.affiliateId) await recountAffiliate(tx, order.affiliateId);
    if (!attribution) return;

    await holdOrderCommission(tx, {
      storeId,
      orderId: order.id,
      customerId: order.customerId,
      contactEmail: order.contactEmail,
      attribution,
      parts: storedEarningPartsOf(order),
      productIds: order.items.map((item) => item.productId),
    });
    if (order.status === 'DELIVERED') {
      const delivered = await tx.orderEvent.findFirst({ where: { orderId: order.id, status: 'DELIVERED' }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
      // The period is the delivery's day's, whenever the order was moved: `dateOrderCommission` reads only its day.
      await dateOrderCommission(tx, order.id, delivered?.createdAt ?? new Date());
    }
  }

  private async readOf(orderId: string): Promise<OrderAffiliate> {
    const row = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: {
        status: true,
        affiliate: { select: { id: true, name: true, slug: true, status: true } },
        affiliateCommission: true,
        affiliateChanges: { orderBy: { createdAt: 'asc' } },
        refunds: { where: { status: 'DONE' }, select: { amountCents: true } },
      },
    });
    return toOrderAffiliate(row);
  }
}

function orderMissing(number: number): NotFoundException {
  return new NotFoundException(affiliateError('ORDER_NOT_FOUND', `No order ${number} in this shop`));
}
