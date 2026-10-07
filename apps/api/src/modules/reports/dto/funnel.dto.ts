// Nest
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

// Types
import type { CountedFunnelStep, FunnelEventInput, FunnelStep, FunnelStepCount, StoreFunnelReport } from '@harness-monorepo/contracts';

// App
import { COUNTED_FUNNEL_STEPS, FUNNEL_STEPS } from '../funnel-steps.js';
import { SalesByOriginDto } from './sales-by-origin.dto.js';

/** One step to count. Its name and nothing else: the pipe refuses any other field. */
export class FunnelEventDto implements FunnelEventInput {
  @ApiProperty({ enum: COUNTED_FUNNEL_STEPS })
  @IsIn(COUNTED_FUNNEL_STEPS)
  step!: CountedFunnelStep;
}

/** The period asked, as every report takes it. */
export class StoreFunnelQueryDto extends SalesByOriginDto {}

export class FunnelStepCountResponse implements FunnelStepCount {
  @ApiProperty({ enum: FUNNEL_STEPS }) step!: FunnelStep;
  @ApiProperty({ description: 'Events, not people — but for PURCHASE, which is orders.' }) count!: number;
}

export class StoreFunnelResponse implements StoreFunnelReport {
  @ApiProperty({ example: '2026-10-01', description: 'The period used.' }) from!: string;
  @ApiProperty({ example: '2026-10-31' }) to!: string;
  @ApiProperty({ type: [FunnelStepCountResponse], description: 'The five steps, in order.' }) steps!: FunnelStepCountResponse[];
  @ApiProperty({ description: 'Sales registered in the panel over the same days: no step of the funnel.' }) panelSales!: number;
  @ApiProperty({ nullable: true, type: String, example: '2026-10-06', description: 'The first day this shop has a counter of; purchases are counted from it.' }) countingSince!: string | null;
  @ApiProperty({ example: 13 }) retentionMonths!: number;
}
