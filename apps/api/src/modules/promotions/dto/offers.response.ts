// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { CouponKind, CustomerFirstPurchaseOffer, CustomerOffers, DiscountAudience, FirstPurchaseHeadline, OfferBenefit, OfferedCoupon, PopupTrigger, StorefrontOffers, StorefrontPopup } from '@harness-monorepo/contracts';

// App
import { COUPON_KINDS, DISCOUNT_AUDIENCES } from '../promotions.constants.js';
import { POPUP_TRIGGERS } from '../shop-popup.js';

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

/** What a pop-up says and when it opens: the part its owner's read and a visitor's share (BEELINK-306). */
export class PopupCopyResponse {
  @ApiProperty({ nullable: true, type: String, description: 'http(s); null draws the coloured panel alone.' }) imageUrl!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Null is the default. May carry {beneficio}.' }) title!: string | null;
  @ApiProperty({ nullable: true, type: String }) text!: string | null;
  @ApiProperty({ nullable: true, type: String }) buttonLabel!: string | null;
  @ApiProperty({ enum: POPUP_TRIGGERS }) trigger!: PopupTrigger;
  @ApiProperty({ description: 'Seconds after the page arrives, on ON_ARRIVAL.' }) delaySeconds!: number;
  @ApiProperty({ description: 'Up by one when what a visitor reads changes.' }) revision!: number;
  @ApiProperty({ description: 'Whether the offer strip is drawn once the pop-up is no longer due to whoever is looking, until they close it too (BEELINK-310, BEELINK-311).' }) keepReminder!: boolean;
}

/** The pop-up inside the public offers' answer: no code and no id of a coupon, ever. */
export class StorefrontPopupResponse extends PopupCopyResponse implements StorefrontPopup {
  @ApiProperty({ type: FirstPurchaseHeadlineResponse, nullable: true, description: 'What it announces; null promises no discount.' }) benefit!: FirstPurchaseHeadlineResponse | null;
}

export class StorefrontOffersResponse implements StorefrontOffers {
  @ApiProperty({ type: FirstPurchaseHeadlineResponse, nullable: true, description: "The shop's benefit for a first purchase, without any code; null with none." })
  firstPurchase!: FirstPurchaseHeadlineResponse | null;
  @ApiProperty({ type: StorefrontPopupResponse, nullable: true, description: "The shop's first-purchase pop-up while it is switched on; null otherwise." })
  popup!: StorefrontPopupResponse | null;
}

export class OfferedCouponResponse extends OfferBenefitResponse implements OfferedCoupon {
  @ApiProperty({ example: 'BEMVINDO10' }) code!: string;
  @ApiProperty({ enum: DISCOUNT_AUDIENCES }) audience!: DiscountAudience;
  @ApiProperty({ description: 'Zero: applying it to the cart sent is taken. More: what the products are below its minimum by.' }) missingCents!: number;
}

/** Both arms of `CustomerFirstPurchaseOffer` in one schema: `code` on a COUPON, `wholeCart` on a PROMOTION. */
export class CustomerFirstPurchaseOfferResponse extends OfferBenefitResponse {
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
