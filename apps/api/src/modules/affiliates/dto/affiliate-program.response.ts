// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  AffiliatePayoutPeriod,
  AffiliateProgram,
  AffiliateProgramOverview,
  CommissionCategoryRate,
  CommissionProductRate,
  CommissionTable,
  CommissionTableSummary,
} from '@harness-monorepo/contracts';

export class AffiliateProgramResponse implements AffiliateProgram {
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ example: 30 }) attributionDays!: number;
  @ApiProperty({ example: 10 }) payoutDelayDays!: number;
  @ApiProperty({ nullable: true, type: String }) termsText!: string | null;
  @ApiProperty({ description: '0 until terms are first written.' }) termsVersion!: number;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class AffiliatePayoutPeriodResponse implements AffiliatePayoutPeriod {
  @ApiProperty({ format: 'date', example: '2026-11-01' }) firstDay!: string;
  @ApiProperty({ format: 'date', example: '2026-11-10' }) lastDay!: string;
  @ApiProperty({ format: 'date', example: '2026-11-20', description: 'The last day plus the programme\'s delay.' }) dueOn!: string;
}

class CommissionTableOwnerResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

export class CommissionTableSummaryResponse implements CommissionTableSummary {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 1000 }) defaultRateBps!: number;
  @ApiProperty({ description: 'Born with the programme; never deleted.' }) isDefault!: boolean;
  @ApiProperty() productRateCount!: number;
  @ApiProperty() categoryRateCount!: number;
  @ApiProperty({ description: 'Affiliates on it who have not ended; a table with any is not deleted.' }) affiliateCount!: number;
  @ApiProperty({ nullable: true, type: CommissionTableOwnerResponse, description: "The affiliate whose own commission it is; null for a shared table." }) affiliate!: CommissionTableOwnerResponse | null;
}

export class AffiliateProgramOverviewResponse implements AffiliateProgramOverview {
  @ApiProperty({ type: AffiliateProgramResponse }) program!: AffiliateProgramResponse;
  @ApiProperty({ type: [CommissionTableSummaryResponse], description: 'The default table first, then by name.' }) tables!: CommissionTableSummaryResponse[];
  @ApiProperty({ type: [AffiliatePayoutPeriodResponse], description: "The running month's three periods, at the saved delay." }) periods!: AffiliatePayoutPeriodResponse[];
  @ApiProperty({ description: 'Whether this deployment credits orders to affiliates yet: off until the privacy policy names them (AFFILIATE_LINKS_ENABLED).' }) linksLive!: boolean;
}

export class CommissionProductRateResponse implements CommissionProductRate {
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty({ example: 0 }) rateBps!: number;
}

export class CommissionCategoryRateResponse implements CommissionCategoryRate {
  @ApiProperty({ format: 'uuid' }) categoryId!: string;
  @ApiProperty({ example: 1500 }) rateBps!: number;
}

export class CommissionTableResponse implements CommissionTable {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 1000 }) defaultRateBps!: number;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty({ type: [CommissionProductRateResponse], description: 'By product: these come first.' }) rates!: CommissionProductRateResponse[];
  @ApiProperty({ type: [CommissionCategoryRateResponse], description: 'By category: for the products of it with no rate of their own.' }) categoryRates!: CommissionCategoryRateResponse[];
  @ApiProperty({ nullable: true, type: CommissionTableOwnerResponse, description: "The affiliate whose own commission it is; null for a shared table." }) affiliate!: CommissionTableOwnerResponse | null;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
