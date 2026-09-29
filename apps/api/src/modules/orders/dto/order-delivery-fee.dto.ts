// Nest
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

// Types
import type { SetOrderDeliveryFeePayload } from '@harness-monorepo/contracts';

// App
import { ORDER_AMOUNT_MAX_CENTS } from '../orders.constants.js';

/** The fee the shop agreed for a delivery (BEELINK-170): whole cents, zero a free delivery. */
export class SetOrderDeliveryFeeDto implements SetOrderDeliveryFeePayload {
  @ApiProperty({ minimum: 0, maximum: ORDER_AMOUNT_MAX_CENTS, description: 'Whole cents; zero is a free delivery.' })
  @IsInt()
  @Min(0)
  @Max(ORDER_AMOUNT_MAX_CENTS)
  deliveryFeeCents!: number;
}
