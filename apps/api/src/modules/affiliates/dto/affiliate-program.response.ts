// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  AffiliatePayoutPeriod,
  AffiliateProgram,
  AffiliateProgramOverview,
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

export class CommissionTableSummaryResponse implements CommissionTableSummary {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 1000 }) defaultRateBps!: number;
  @ApiProperty({ description: 'Born with the programme; never deleted.' }) isDefault!: boolean;
  @ApiProperty() productRateCount!: number;
}

export class AffiliateProgramOverviewResponse implements AffiliateProgramOverview {
  @ApiProperty({ type: AffiliateProgramResponse }) program!: AffiliateProgramResponse;
  @ApiProperty({ type: [CommissionTableSummaryResponse], description: 'The default table first, then by name.' }) tables!: CommissionTableSummaryResponse[];
  @ApiProperty({ type: [AffiliatePayoutPeriodResponse], description: "The running month's three periods, at the saved delay." }) periods!: AffiliatePayoutPeriodResponse[];
}

export class CommissionProductRateResponse implements CommissionProductRate {
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty({ example: 0 }) rateBps!: number;
}

export class CommissionTableResponse implements CommissionTable {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: 1000 }) defaultRateBps!: number;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty({ type: [CommissionProductRateResponse] }) rates!: CommissionProductRateResponse[];
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
