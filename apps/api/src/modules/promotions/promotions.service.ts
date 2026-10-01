// Nest
import { Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { Promotion, PromotionPage, PromotionStatus } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import type { PromotionDto, PromotionListDto, SetDiscountActiveDto } from './dto/promotion.dto.js';
import { assertPeriod, discountOf, targetsOf } from './promotion-rules.js';
import { promotionWhereOf } from './promotion-status.js';
import { DISCOUNTS_PAGE_SIZE, promotionError, UUID } from './promotions.constants.js';
import { promotionInclude, toPromotion } from './promotions.mapper.js';

const NEWEST: Prisma.PromotionOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'desc' }];

/** A product or a category named was deleted between being checked and being written. */
function isForeignKeyViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003';
}

/**
 * A shop's promotions as its owner keeps them (BEELINK-190): the records, and where each stands.
 * What a promotion is worth on a cart is not read here.
 */
@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /** The newest first; the counts are of every promotion of the shop, whatever the filter. */
  async list(storeSlug: string, userId: string, query: PromotionListDto): Promise<PromotionPage> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    // One instant for the rows, their statuses and the counts: read apart, a promotion ending
    // meanwhile would be counted twice or not at all.
    const now = new Date();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DISCOUNTS_PAGE_SIZE;
    const count = (status: PromotionStatus) => this.prisma.promotion.count({ where: { storeId, ...promotionWhereOf(status, now) } });

    const [rows, ENDED, PAUSED, SCHEDULED, ACTIVE] = await Promise.all([
      this.prisma.promotion.findMany({
        where: { storeId, ...(query.status ? promotionWhereOf(query.status, now) : {}) },
        orderBy: NEWEST,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: promotionInclude,
      }),
      count('ENDED'),
      count('PAUSED'),
      count('SCHEDULED'),
      count('ACTIVE'),
    ]);
    const counts = { ALL: ENDED + PAUSED + SCHEDULED + ACTIVE, ENDED, PAUSED, SCHEDULED, ACTIVE };

    return {
      promotions: rows.map((row) => toPromotion(row, now)),
      total: query.status ? counts[query.status] : counts.ALL,
      page,
      pageSize,
      counts,
    } satisfies PromotionPage;
  }

  async get(storeSlug: string, userId: string, promotionId: string): Promise<Promotion> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const id = await this.idOf(storeId, promotionId);
    return toPromotion(await this.prisma.promotion.findUniqueOrThrow({ where: { id }, include: promotionInclude }), new Date());
  }

  async create(storeSlug: string, userId: string, dto: PromotionDto): Promise<Promotion> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const { fields, productIds, categoryIds } = await this.writeOf(storeId, dto);

    const row = await this.prisma.promotion
      .create({
        data: {
          storeId,
          ...fields,
          products: { createMany: { data: productIds.map((productId) => ({ productId })) } },
          categories: { createMany: { data: categoryIds.map((categoryId) => ({ categoryId })) } },
        },
        include: promotionInclude,
      })
      .catch(this.refuseGoneTarget);
    return toPromotion(row, new Date());
  }

  /** A replacement, as the shop's own: the whole of what the form edits, its lists included. */
  async replace(storeSlug: string, userId: string, promotionId: string, dto: PromotionDto): Promise<Promotion> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const id = await this.idOf(storeId, promotionId);
    const { fields, productIds, categoryIds } = await this.writeOf(storeId, dto);

    const row = await this.prisma.promotion
      .update({
        where: { id },
        data: {
          ...fields,
          products: { deleteMany: {}, createMany: { data: productIds.map((productId) => ({ productId })) } },
          categories: { deleteMany: {}, createMany: { data: categoryIds.map((categoryId) => ({ categoryId })) } },
        },
        include: promotionInclude,
      })
      .catch(this.refuseGoneTarget);
    return toPromotion(row, new Date());
  }

  /** Paused, or switched back on; the same state asked again changes nothing. */
  async setActive(storeSlug: string, userId: string, promotionId: string, dto: SetDiscountActiveDto): Promise<Promotion> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const id = await this.idOf(storeId, promotionId);
    const row = await this.prisma.promotion.update({ where: { id }, data: { isActive: dto.active }, include: promotionInclude });
    return toPromotion(row, new Date());
  }

  /** The id of a promotion of this shop's; another shop's, or none at all, is one answer. */
  private async idOf(storeId: string, promotionId: string): Promise<string> {
    const row = UUID.test(promotionId) ? await this.prisma.promotion.findFirst({ where: { id: promotionId.toLowerCase(), storeId }, select: { id: true } }) : null;
    if (!row) throw new NotFoundException(promotionError('PROMOTION_NOT_FOUND', 'No such promotion in this shop'));
    return row.id;
  }

  /** What a body writes, once its rules hold and everything it names is this shop's. */
  private async writeOf(storeId: string, dto: PromotionDto) {
    const discount = discountOf(dto.discountKind, dto.percentBps, dto.amountCents, 'PROMOTION_DISCOUNT_INVALID');
    assertPeriod(dto.startsAt, dto.endsAt, 'PROMOTION_PERIOD_INVALID');
    const { productIds, categoryIds } = targetsOf(dto.scope, dto.productIds, dto.categoryIds);

    const [products, categories] = await Promise.all([
      productIds.length > 0 ? this.prisma.product.count({ where: { storeId, id: { in: productIds } } }) : 0,
      categoryIds.length > 0 ? this.prisma.productCategory.count({ where: { storeId, id: { in: categoryIds } } }) : 0,
    ]);
    if (products !== productIds.length || categories !== categoryIds.length) throw this.targetNotFound();

    const fields = {
      name: dto.name,
      scope: dto.scope,
      discountKind: dto.discountKind,
      ...discount,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt ?? null,
      isActive: dto.active ?? true,
    } satisfies Prisma.PromotionUpdateInput;
    return { fields, productIds, categoryIds };
  }

  private targetNotFound(): NotFoundException {
    return new NotFoundException(promotionError('PROMOTION_TARGET_NOT_FOUND', 'A product or a category named is not of this shop'));
  }

  private readonly refuseGoneTarget = (error: unknown): never => {
    throw isForeignKeyViolation(error) ? this.targetNotFound() : error;
  };
}
