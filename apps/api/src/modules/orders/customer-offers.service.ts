// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { CustomerFirstPurchaseOffer, CustomerOffers, OfferedCoupon } from '@harness-monorepo/contracts';
import type { CouponModel } from '../../generated/prisma/models.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { couponRefusalOf, couponStandingRefusalOf, type CouponStanding } from '../promotions/coupon-verdict.js';
import { customerUsesOf, firstPurchaseOf, runningPromotions } from '../promotions/order-discounts.js';
import { couponBenefitOf, firstOrderOfferOf, shownCoupons } from '../promotions/shop-offers.js';
import type { CustomerOffersDto } from './dto/order-quote.dto.js';
import { OrderQuotes } from './order-quote.service.js';

/** A shown coupon in force, with what is read of this customer for it. */
interface Candidate {
  coupon: CouponModel;
  standing: CouponStanding;
}

/**
 * A shopper's own offers at the shop: whether an order of theirs stands, the first-order benefit to
 * show them, and the shown coupons their cart may take.
 *
 * It decides nothing of its own. Whether they are on a first purchase is `firstPurchaseOf`, the rule
 * an order is priced with. Whether a coupon is theirs is `couponStandingRefusalOf`, and whether
 * their cart takes it is `couponRefusalOf` over the cart as their quote prices it
 * (`OrderQuotes.couponBaseFor`) — the two halves of the verdict that answers a code typed. So a
 * coupon listed as usable is one that applying, a moment later, takes; what changes in that moment
 * is the quote's to say, as it always was.
 *
 * And it reads no coupon its shopkeeper did not switch on to be shown (`shownCoupons`): nothing
 * sent here — a cart, an address — makes a hidden code appear.
 */
@Injectable()
export class CustomerOffersReader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly quotes: OrderQuotes,
  ) {}

  async forCustomer(storeSlug: string, userId: string, dto: CustomerOffersDto): Promise<CustomerOffers> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    const now = new Date();
    const [firstPurchase, shown] = await Promise.all([firstPurchaseOf(this.prisma, customerId, false), shownCoupons(this.prisma, storeId, now, this.prisma.coupon.fields.maxUses)]);

    // Their uses are read only of a coupon that limits them, as the quote reads them.
    const candidates: Candidate[] = await Promise.all(
      shown.map(async (coupon) => ({
        coupon,
        standing: { at: now, firstPurchase, customerUses: coupon.maxUsesPerCustomer === null ? null : await customerUsesOf(this.prisma, coupon.id, customerId) },
      })),
    );
    const theirs = candidates.filter(({ coupon, standing }) => couponStandingRefusalOf(coupon, standing) === null);

    return {
      hasOrder: !firstPurchase,
      firstPurchase: firstPurchase ? await this.firstOrderOffer(storeId, now, theirs) : null,
      coupons: dto.items?.length ? await this.onCart(storeId, customerId, { ...dto, items: dto.items }, theirs) : [],
    } satisfies CustomerOffers;
  }

  /** Their newest shown first-purchase coupon, else the shop's first-purchase promotion: `firstOrderOfferOf`. */
  private async firstOrderOffer(storeId: string, now: Date, theirs: readonly Candidate[]): Promise<CustomerFirstPurchaseOffer | null> {
    const coupon = theirs.find((candidate) => candidate.coupon.audience === 'FIRST_PURCHASE')?.coupon;
    // The promotions are read only when no coupon answers.
    return firstOrderOfferOf(coupon, coupon ? [] : await runningPromotions(this.prisma, storeId, now));
  }

  /** Each of their coupons against the cart: taken, short of its minimum by so much, or left out. */
  private async onCart(storeId: string, customerId: string, cart: CustomerOffersDto & { items: NonNullable<CustomerOffersDto['items']> }, theirs: readonly Candidate[]): Promise<OfferedCoupon[]> {
    if (theirs.length === 0) return [];

    // Only a free delivery reads the fee: with none among them, the carriers are not asked.
    const base = await this.quotes.couponBaseFor(storeId, customerId, cart, theirs.some(({ coupon }) => coupon.kind === 'FREE_SHIPPING'));

    return theirs.flatMap(({ coupon, standing }): OfferedCoupon[] => {
      // At the instant the cart was priced, with who they are as read above: the quote's own question.
      const refusal = couponRefusalOf(coupon, { ...standing, ...base });
      if (refusal && refusal.reason !== 'BELOW_MINIMUM') return [];
      return [{ code: coupon.code, audience: coupon.audience, ...couponBenefitOf(coupon), missingCents: refusal ? coupon.minSubtotalCents - base.baseCents : 0 }];
    });
  }
}
