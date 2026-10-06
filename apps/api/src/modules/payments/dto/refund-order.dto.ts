// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Vendors
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

// Types
import type { OrderCancellationRefund, RefundOrderPayload } from '@harness-monorepo/contracts';

/** What a refund's reason holds: what the shop reads back, and Asaas's description of the refund. */
export const REFUND_REASON_MIN = 3;
export const REFUND_REASON_MAX = 300;

/** Past any charge Asaas makes (R$ 500.000): a bound for the validator, not a rule. */
const CENTS_MAX = 100_000_000;

const trimmed = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

/** The refund a cancellation of a paid order carries. */
export class OrderCancellationRefundDto implements OrderCancellationRefund {
  @ApiProperty({ minLength: REFUND_REASON_MIN, maxLength: REFUND_REASON_MAX, description: 'Why: kept on the refund, and sent to Asaas as its description.' })
  @Transform(trimmed)
  @IsString()
  @Length(REFUND_REASON_MIN, REFUND_REASON_MAX)
  reason!: string;

  @ApiProperty({ minimum: 0, description: 'What the screen showed as left to refund: a refund made meanwhile changes it, and this one is refused.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(CENTS_MAX)
  refundableCents!: number;
}

export class RefundOrderDto extends OrderCancellationRefundDto implements RefundOrderPayload {
  @ApiProperty({ minimum: 1, description: 'Whole cents, never more than what is left to refund.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CENTS_MAX)
  amountCents!: number;

  @ApiPropertyOptional({ format: 'uuid', description: "Money the order did not ask for, by its id, instead of the order's own payment." })
  @IsOptional()
  @IsUUID()
  strayId?: string;
}
