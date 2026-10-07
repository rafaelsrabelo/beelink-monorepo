// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { CouponKind, CustomerFirstPurchaseOffer, CustomerOffers, DiscountAudience, FirstPurchaseHeadline, OfferBenefit, OfferedCoupon, StorefrontOffers } from '@harness-monorepo/contracts';

// App
import { COUPON_KINDS, DISCOUNT_AUDIENCES } from '../promotions.constants.js';
import { StorefrontPopupResponse } from './popup.response.js';

const HEADLINE_SOURCES = ['PROMOTION', 'COUPON'] as const satisfies readonly FirstPurchaseHeadline['source'][];

class OfferBenefitResponse implements OfferBenefit {
  @ApiProperty({ enum: COUPON_KINDS }) kind!: CouponKind;
  @ApiProperty({ nullable: true, type: Number, example: 1000, description: 'Basis points, on a PERCENT.' }) percentBps!: number | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Whole cents, on a FIXED.' }) amountCents!: number | null;
  @ApiProperty({ description: 'What the products have to add up to; zero asks for none.' }) minSubtotalCents!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'Null has no end.' }) endsAt!: string | null;
}

export class FirstPurchaseHeadlineResponse extends OfferBenefitResponse implements FirstPurchaseHeadline {
  @ApiProperty({ enum: HEADLINE_SOURCES, description: 'PROMOTION applies by itself; COUPON is a code an identified customer is shown — never carried here.' }) source!: FirstPurchaseHeadline['source'];
  @ApiProperty({ description: 'False on a promotion over named products or categories.' }) wholeCart!: boolean;
}

export class StorefrontOffersResponse implements StorefrontOffers {
  @ApiProperty({ type: FirstPurchaseHeadlineResponse, nullable: true, description: "The shop's benefit for a first purchase, without any code; null with none." })
  firstPurchase!: FirstPurchaseHeadlineResponse | null;
  @ApiProperty({ type: () => StorefrontPopupResponse, nullable: true, description: "The shop's first-purchase pop-up while it is switched on; null otherwise." })
  popup!: StorefrontPopupResponse | null;
}

export class OfferedCouponResponse extends OfferBenefitResponse implements OfferedCoupon {
  @ApiProperty({ example: 'BEMVINDO10' }) code!: string;
  @ApiProperty({ enum: DISCOUNT_AUDIENCES }) audience!: DiscountAudience;
  @ApiProperty({ description: 'Zero: applying it to the cart sent is taken. More: what the products are below its minimum by.' }) missingCents!: number;
}

/** Both arms of `CustomerFirstPurchaseOffer` in one schema: `code` on a COUPON, `wholeCart` on a PROMOTION. */
class CustomerFirstPurchaseOfferResponse extends OfferBenefitResponse {
  @ApiProperty({ enum: HEADLINE_SOURCES }) source!: CustomerFirstPurchaseOffer['source'];
  @ApiProperty({ required: false, description: 'On a COUPON: the code to apply.' }) code?: string;
  @ApiProperty({ required: false, description: 'On a PROMOTION: false when it is over named products or categories.' }) wholeCart?: boolean;
}

export class CustomerOffersResponse implements CustomerOffers {
  @ApiProperty({ description: 'Whether an order of theirs stands at the shop: any that is not cancelled.' }) hasOrder!: boolean;
  @ApiProperty({ type: CustomerFirstPurchaseOfferResponse, nullable: true, description: 'Null once hasOrder, and with nothing for a first purchase.' })
  firstPurchase!: CustomerFirstPurchaseOffer | null;
  @ApiProperty({ type: [OfferedCouponResponse], description: 'The shown coupons usable on the cart sent, the newest first; empty with no cart.' }) coupons!: OfferedCouponResponse[];
}
