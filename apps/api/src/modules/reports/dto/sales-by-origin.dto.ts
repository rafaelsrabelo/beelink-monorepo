// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Types
import type { SalesByOriginQuery, SalesByOriginReport, SalesByOriginRow, SalesOriginKind } from '@harness-monorepo/contracts';

export const SALES_ORIGIN_KINDS = ['CAMPAIGN', 'DIRECT', 'PANEL'] as const satisfies readonly SalesOriginKind[];

/**
 * The period asked. Strings and nothing more here: what is a day, the order of the two and how far
 * apart they may be is `reportPeriodOf`'s to say, with one error code for all of it.
 */
export class SalesByOriginDto implements SalesByOriginQuery {
  @ApiPropertyOptional({ example: '2026-10-01', description: 'First day counted, `YYYY-MM-DD` on the shop\'s clock (Brasília). With `to`, or neither.' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Last day counted, whole. At most 366 days from `from`.' })
  @IsOptional()
  @IsString()
  to?: string;
}

export class SalesByOriginRowResponse implements SalesByOriginRow {
  @ApiProperty({ enum: SALES_ORIGIN_KINDS, description: 'CAMPAIGN: placed from the cart with campaign labels or a kept Meta ad click. DIRECT: placed from the cart with neither. PANEL: registered by the shopkeeper.' })
  kind!: SalesOriginKind;
  @ApiProperty({ nullable: true, type: String, description: '`utm_source`, lower case.' }) source!: string | null;
  @ApiProperty({ nullable: true, type: String, description: '`utm_medium`, lower case.' }) medium!: string | null;
  @ApiProperty({ nullable: true, type: String, description: '`utm_campaign` as written in the link — text, never markup.' }) campaign!: string | null;
  @ApiProperty() orders!: number;
  @ApiProperty({ description: 'How many of them came by a Meta ad click kept with the buyer\'s yes: a floor.' }) metaAdOrders!: number;
  @ApiProperty({ description: 'Sum of the orders\' totals in whole cents — the `value` a purchase carries to Meta.' }) revenueCents!: number;
}

export class SalesTotalsResponse {
  @ApiProperty() orders!: number;
  @ApiProperty() revenueCents!: number;
}

export class SalesByOriginResponse implements SalesByOriginReport {
  @ApiProperty({ example: '2026-10-01', description: 'The period used.' }) from!: string;
  @ApiProperty({ example: '2026-10-31' }) to!: string;
  @ApiProperty({ type: [SalesByOriginRowResponse], description: 'Highest revenue first.' }) rows!: SalesByOriginRowResponse[];
  @ApiProperty({ type: SalesTotalsResponse, description: 'The shop\'s sales in the period: the rows add up to it.' }) totals!: SalesTotalsResponse;
}
