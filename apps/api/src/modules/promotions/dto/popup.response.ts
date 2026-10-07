// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { PopupBenefitOption, PopupBenefitSource, PopupTrigger, StorefrontPopup, StorePopupOverview } from '@harness-monorepo/contracts';

// App
import { POPUP_BENEFIT_SOURCES, POPUP_TRIGGERS } from '../shop-popup.js';
import { FirstPurchaseHeadlineResponse } from './offers.response.js';

const NAMED_SOURCES = ['PROMOTION', 'COUPON'] as const satisfies readonly PopupBenefitOption['source'][];

class PopupCopyResponse {
  @ApiProperty({ nullable: true, type: String, description: 'http(s); null draws the coloured panel alone.' }) imageUrl!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Null is the default. May carry {beneficio}.' }) title!: string | null;
  @ApiProperty({ nullable: true, type: String }) text!: string | null;
  @ApiProperty({ nullable: true, type: String }) buttonLabel!: string | null;
  @ApiProperty({ enum: POPUP_TRIGGERS }) trigger!: PopupTrigger;
  @ApiProperty({ description: 'Seconds after the page arrives, on ON_ARRIVAL.' }) delaySeconds!: number;
  @ApiProperty({ description: 'Up by one when what a visitor reads changes.' }) revision!: number;
}

/** The pop-up inside the public offers' answer: no code and no id of a coupon, ever. */
export class StorefrontPopupResponse extends PopupCopyResponse implements StorefrontPopup {
  @ApiProperty({ type: FirstPurchaseHeadlineResponse, nullable: true, description: 'What it announces; null promises no discount.' }) benefit!: FirstPurchaseHeadlineResponse | null;
}

class StorePopupSettingsResponse extends PopupCopyResponse {
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ enum: POPUP_BENEFIT_SOURCES }) benefitSource!: PopupBenefitSource;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) benefitId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'Null until first saved.' }) updatedAt!: string | null;
}

class PopupBenefitOptionResponse implements PopupBenefitOption {
  @ApiProperty({ enum: NAMED_SOURCES }) source!: PopupBenefitOption['source'];
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ description: "The promotion's name, or the coupon's code." }) label!: string;
  @ApiProperty({ type: FirstPurchaseHeadlineResponse }) benefit!: FirstPurchaseHeadlineResponse;
}

export class StorePopupOverviewResponse implements StorePopupOverview {
  @ApiProperty({ type: StorePopupSettingsResponse }) settings!: StorePopupSettingsResponse;
  @ApiProperty({ type: FirstPurchaseHeadlineResponse, nullable: true, description: 'What the pop-up as saved announces now.' }) benefit!: FirstPurchaseHeadlineResponse | null;
  @ApiProperty({ type: [PopupBenefitOptionResponse], description: 'The first-purchase promotions running and shown coupons in force.' }) options!: PopupBenefitOptionResponse[];
}
