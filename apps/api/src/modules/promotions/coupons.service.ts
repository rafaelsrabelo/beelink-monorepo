// Nest
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { Coupon, CouponPage, CouponRedemptionPage, CouponStatus } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { uniqueViolationOn } from '../catalog/product-rules.js';
import { StoresService } from '../stores/stores.service.js';
import type { CouponDto, CouponListDto, CouponRedemptionListDto, SetDiscountActiveDto } from './dto/promotion.dto.js';
import { discountOf, periodOf } from './promotion-rules.js';
import { couponWhereOf } from './promotion-status.js';
import { DISCOUNTS_PAGE_SIZE, promotionError, UUID } from './promotions.constants.js';
import { redemptionInclude, toCoupon, toCouponRedemption } from './promotions.mapper.js';

const NEWEST = [{ createdAt: 'desc' }, { id: 'desc' }] as const satisfies Prisma.CouponOrderByWithRelationInput[];

/**
 * A shop's coupons as its owner keeps them (BEELINK-190): the records, where each stands and the
 * orders each went into. Whether a code is worth anything on a cart is not read here, and nothing
 * here moves `usedCount` — the transaction that places the order does.
 */
@Injectable()
export class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /** The newest first; the counts are of every coupon of the shop, whatever the filter. */
  async list(storeSlug: string, userId: string, query: CouponListDto): Promise<CouponPage> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    // One instant for the rows, their statuses and the counts, as the promotions' list.
    const now = new Date();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DISCOUNTS_PAGE_SIZE;
    const whereOf = (status: CouponStatus) => ({ storeId, ...couponWhereOf(status, now, this.prisma.coupon.fields.maxUses) });
    const count = (status: CouponStatus) => this.prisma.coupon.count({ where: whereOf(status) });

    const [rows, ENDED, EXHAUSTED, PAUSED, SCHEDULED, ACTIVE] = await Promise.all([
      this.prisma.coupon.findMany({ where: query.status ? whereOf(query.status) : { storeId }, orderBy: NEWEST, skip: (page - 1) * pageSize, take: pageSize }),
      count('ENDED'),
      count('EXHAUSTED'),
      count('PAUSED'),
      count('SCHEDULED'),
      count('ACTIVE'),
    ]);
    const counts = { ALL: ENDED + EXHAUSTED + PAUSED + SCHEDULED + ACTIVE, ENDED, EXHAUSTED, PAUSED, SCHEDULED, ACTIVE };

    return {
      coupons: rows.map((row) => toCoupon(row, now)),
      total: query.status ? counts[query.status] : counts.ALL,
      page,
      pageSize,
      counts,
    } satisfies CouponPage;
  }

  async get(storeSlug: string, userId: string, couponId: string): Promise<Coupon> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const id = await this.idOf(storeId, couponId);
    return toCoupon(await this.prisma.coupon.findUniqueOrThrow({ where: { id } }), new Date());
  }

  async create(storeSlug: string, userId: string, dto: CouponDto): Promise<Coupon> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const row = await this.prisma.coupon.create({ data: { storeId, ...fieldsOf(dto), isActive: dto.active ?? true } }).catch(refuseTakenCode);
    return toCoupon(row, new Date());
  }

  /**
   * A replacement, as the shop's own. Everything may change, the code of a used coupon too: an
   * order keeps what it took as it was. A `maxUses` below what was used is taken — it reads exhausted.
   * The switch alone stays as it is when the body leaves it out, as a promotion's.
   */
  async replace(storeSlug: string, userId: string, couponId: string, dto: CouponDto): Promise<Coupon> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const id = await this.idOf(storeId, couponId);
    const data = { ...fieldsOf(dto), ...(dto.active === undefined ? {} : { isActive: dto.active }) };
    const row = await this.prisma.coupon.update({ where: { id }, data }).catch(refuseTakenCode);
    return toCoupon(row, new Date());
  }

  /** Paused, or switched back on; the same state asked again changes nothing. */
  async setActive(storeSlug: string, userId: string, couponId: string, dto: SetDiscountActiveDto): Promise<Coupon> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const id = await this.idOf(storeId, couponId);
    return toCoupon(await this.prisma.coupon.update({ where: { id }, data: { isActive: dto.active } }), new Date());
  }

  /** The orders a coupon went into, the most recent first — cancelled ones too, each with its status. */
  async redemptions(storeSlug: string, userId: string, couponId: string, query: CouponRedemptionListDto): Promise<CouponRedemptionPage> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const id = await this.idOf(storeId, couponId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DISCOUNTS_PAGE_SIZE;

    const [rows, total] = await Promise.all([
      this.prisma.couponRedemption.findMany({
        where: { couponId: id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: redemptionInclude,
      }),
      this.prisma.couponRedemption.count({ where: { couponId: id } }),
    ]);
    return { redemptions: rows.map(toCouponRedemption), total, page, pageSize } satisfies CouponRedemptionPage;
  }

  /** The id of a coupon of this shop's; another shop's, or none at all, is one answer. */
  private async idOf(storeId: string, couponId: string): Promise<string> {
    const row = UUID.test(couponId) ? await this.prisma.coupon.findFirst({ where: { id: couponId.toLowerCase(), storeId }, select: { id: true } }) : null;
    if (!row) throw new NotFoundException(promotionError('COUPON_NOT_FOUND', 'No such coupon in this shop'));
    return row.id;
  }
}

/** What a body writes, once its rules hold — all but the switch, which a create and a replace read apart. */
function fieldsOf(dto: CouponDto) {
  const discount = discountOf(dto.kind, dto.percentBps, dto.amountCents, 'COUPON_DISCOUNT_INVALID');
  const period = periodOf(dto.startsAt, dto.endsAt, 'COUPON_PERIOD_INVALID');

  return {
    // Only ASCII reaches here (COUPON_CODE), so raising the case changes no letter into another.
    code: dto.code.toUpperCase(),
    kind: dto.kind,
    ...discount,
    minSubtotalCents: dto.minSubtotalCents ?? 0,
    ...period,
    maxUses: dto.maxUses ?? null,
    maxUsesPerCustomer: dto.maxUsesPerCustomer ?? null,
  } satisfies Prisma.CouponUpdateInput;
}

function refuseTakenCode(error: unknown): never {
  if (uniqueViolationOn(error) === 'Coupon') {
    throw new ConflictException(promotionError('COUPON_CODE_TAKEN', 'Another coupon of this shop already has this code'));
  }
  throw error;
}
