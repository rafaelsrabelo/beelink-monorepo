// Nest
import { ConflictException, Injectable, Logger } from '@nestjs/common';

// Types
import type { BillingErrorCode, StoreSubscriptionAnswer } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { env } from '../../shared/config/env.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { unavailable } from './billing-refusals.js';
import { billingError } from './billing.constants.js';
import { BillingService } from './billing.service.js';
import { couponPageRefusalOf, couponRefusalOf, freeMonthOf, storedCouponCodeOf, type FreeMonth } from './platform-coupon-rules.js';
import { PlatformAsaas } from './platform-asaas.client.js';
import { StoreSubscriptions } from './store-subscriptions.service.js';
import { statusAt } from './subscription-status.js';

type CouponCode = Extract<BillingErrorCode, `BILLING_COUPON_${string}`>;

/** What each refusal of a coupon says to a log and to Swagger; the panel words it from the code. */
const SAID = {
  BILLING_COUPON_NOT_FOUND: 'No coupon has that code',
  BILLING_COUPON_DISABLED: 'The coupon was switched off',
  BILLING_COUPON_EXPIRED: 'The coupon is past its last day',
  BILLING_COUPON_EXHAUSTED: 'The coupon was used by as many pages as it allows',
  BILLING_COUPON_ALREADY_USED: 'The page used a coupon already: one in its life',
  BILLING_COUPON_PAGE_PAID: 'The page paid for its plan before: a coupon is for a page that never did',
} satisfies Record<CouponCode, string>;

/** The refusals a page's standing gives, beside the coupon's own. */
const PAGE_SAID = {
  BILLING_PAGE_EXEMPT: 'The page owes nothing: a free month gives it nothing',
  BILLING_PAGE_ACTIVE: 'A period already paid for is running',
} as const;

function refused(code: CouponCode | keyof typeof PAGE_SAID): ConflictException {
  const message = Object.hasOwn(PAGE_SAID, code) ? PAGE_SAID[code as keyof typeof PAGE_SAID] : SAID[code as CouponCode];
  return new ConflictException(billingError(code, message));
}

function busy(): ConflictException {
  return new ConflictException(billingError('BILLING_SUBSCRIPTION_BUSY', "The page's subscription is being told to Asaas: try the coupon again in a moment"));
}

const isUniqueViolation = (error: unknown): boolean => error instanceof Error && 'code' in error && error.code === 'P2002';

/** A timestamp as Prisma writes these columns: UTC wall time, no zone. */
const wallTimeOf = (date: Date) => date.toISOString().replace('Z', '');

/** The page's row, as a coupon's use reads it. */
const PAGE_COLUMNS = {
  id: true,
  status: true,
  trialEndsAt: true,
  currentPeriodEndsAt: true,
  graceEndsAt: true,
  freePeriodEndsAt: true,
  asaasSubscriptionId: true,
  asaasSubscriptionClaimedUntil: true,
  couponRedemption: { select: { id: true } },
} as const;

/**
 * A coupon of bee-link's used on a page (BEELINK-224): one free month, never a discount, once in the
 * page's life, and nothing made at Asaas for it. All this writes is the use, the coupon's count and the
 * page's `freePeriodEndsAt` — which the lock already reads before anything else (`page-lock.ts`) — so the
 * page's standing does not move: a page that never paid stays one, free until the month ends.
 *
 * Every refusal the page and the coupon can give is said before anything is written or removed, so a
 * coupon refused never costs the page the invoice it has open. Only a page whose row names a
 * subscription at Asaas has it taken out first, by the one talk about a page's subscription
 * (`StoreSubscriptions.withdraw`); any other is given its month with Asaas never asked. The month is
 * then written in one transaction that holds the page's row — so the same page twice at once is one use
 * — and moves the coupon's count by an UPDATE that passes only while the coupon holds, so two pages at
 * once on its last use are one use too.
 */
@Injectable()
export class PlatformCoupons {
  private readonly logger = new Logger(PlatformCoupons.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly subscriptions: StoreSubscriptions,
    private readonly billing: BillingService,
    private readonly asaas: PlatformAsaas,
  ) {}

  async redeem(storeSlug: string, userId: string, typed: string): Promise<StoreSubscriptionAnswer> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    // Where nothing is charged nothing locks, and a free month gives nothing.
    if (!env.BILLING_ENFORCED) throw new ConflictException(billingError('BILLING_NOT_ENFORCED', 'This deployment charges no page for its plan'));
    if (!this.asaas.configured) throw unavailable();
    const code = storedCouponCodeOf(typed);
    if (!code) throw refused('BILLING_COUPON_NOT_FOUND');

    const { row } = await this.vetted(this.prisma, storeId, code, new Date());
    if (row.asaasSubscriptionId) await this.subscriptions.withdraw(storeId, userId);

    const given = await this.give(storeId, code).catch((error: unknown) => {
      // The page's row is held first, so a second use of one page waits and is refused before this: the index is the floor under it.
      throw isUniqueViolation(error) ? refused('BILLING_COUPON_ALREADY_USED') : error;
    });

    this.logger.log({ storeId, subscriptionId: given.subscriptionId, couponId: given.couponId, freePeriodEndsAt: given.month.endsAt.toISOString() }, "A page was given a free month by a coupon of bee-link's");
    return this.billing.answerOf(storeId);
  }

  /**
   * The use itself, under the page's row lock and with everything vetted again inside it: the coupon's
   * count moved only while it holds, the use written, the month on the page's row.
   */
  private give(storeId: string, code: string): Promise<{ subscriptionId: string; couponId: string; month: FreeMonth }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "store_subscriptions" WHERE "storeId" = ${storeId}::uuid FOR UPDATE`;
      const now = new Date();
      const { row, couponId } = await this.vetted(tx, storeId, code, now);
      // A choice of a cycle named a subscription since the first look: it is taken out on the next try, not under this lock.
      if (row.asaasSubscriptionId) throw busy();

      const at = wallTimeOf(now);
      const counted = await tx.$executeRaw`
        UPDATE "platform_coupons"
        SET "redemptionCount" = "redemptionCount" + 1, "updatedAt" = ${at}::timestamp
        WHERE "id" = ${couponId}::uuid
          AND "disabledAt" IS NULL
          AND ("expiresAt" IS NULL OR "expiresAt" > ${at}::timestamp)
          AND ("maxRedemptions" IS NULL OR "redemptionCount" < "maxRedemptions")`;
      if (counted === 0) {
        // Another use was written while this one waited for the coupon's row: what it is now says why.
        const coupon = await tx.platformCoupon.findUniqueOrThrow({ where: { id: couponId } });
        throw refused(couponRefusalOf(coupon, now) ?? 'BILLING_COUPON_EXHAUSTED');
      }

      const month = freeMonthOf(row, now);
      await tx.platformCouponRedemption.create({ data: { couponId, subscriptionId: row.id, freePeriodStartsAt: month.startsAt, freePeriodEndsAt: month.endsAt } });
      await tx.storeSubscription.update({ where: { id: row.id }, data: { freePeriodEndsAt: month.endsAt } });
      return { subscriptionId: row.id, couponId, month };
    });
  }

  /**
   * Every refusal at `now`, in the order the plan gives: no subscription; the page's standing — exempt,
   * paid for, or paid before; a coupon used already; the coupon itself — none, switched off, past its
   * last day, used up; another talk holding the page. Answers the page's row and the coupon's id.
   */
  private async vetted(db: Prisma.TransactionClient, storeId: string, code: string, now: Date) {
    const row = await db.storeSubscription.findUnique({ where: { storeId }, select: PAGE_COLUMNS });
    if (!row) throw new ConflictException(billingError('BILLING_SUBSCRIPTION_MISSING', 'A page from before subscriptions existed has no subscription to give a month to yet'));

    const pageRefusal = couponPageRefusalOf(statusAt(row, now));
    if (pageRefusal) throw refused(pageRefusal);
    if (row.couponRedemption) throw refused('BILLING_COUPON_ALREADY_USED');

    const coupon = await db.platformCoupon.findUnique({ where: { code } });
    if (!coupon) throw refused('BILLING_COUPON_NOT_FOUND');
    const couponRefusal = couponRefusalOf(coupon, now);
    if (couponRefusal) throw refused(couponRefusal);

    if (row.asaasSubscriptionClaimedUntil && row.asaasSubscriptionClaimedUntil > now) throw busy();
    return { row, couponId: coupon.id };
  }
}
