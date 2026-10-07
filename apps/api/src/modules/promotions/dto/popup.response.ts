// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { PopupBenefitOption, PopupBenefitSource, StorePopupOverview } from '@harness-monorepo/contracts';

// App
import { POPUP_BENEFIT_SOURCES } from '../shop-popup.js';
// One way only: `offers.response.ts` holds what anyone is served, the pop-up's public shape among it, and imports nothing from here.
import { FirstPurchaseHeadlineResponse, PopupCopyResponse } from './offers.response.js';

const NAMED_SOURCES = ['PROMOTION', 'COUPON'] as const satisfies readonly PopupBenefitOption['source'][];

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
  @ApiProperty({ type: FirstPurchaseHeadlineResponse, nullable: true, description: "What following the shop's headline announces now, whatever is saved." }) headline!: FirstPurchaseHeadlineResponse | null;
  @ApiProperty({ type: [PopupBenefitOptionResponse], description: 'The first-purchase promotions running and shown coupons in force.' }) options!: PopupBenefitOptionResponse[];
}
