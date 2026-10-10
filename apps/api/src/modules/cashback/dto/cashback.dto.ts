// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength, NotEquals, ValidateIf } from 'class-validator';

// Types
import type { CashbackAdjustmentPayload, CashbackErrorCode, CashbackMode, CashbackSettingsPayload } from '@harness-monorepo/contracts';

// App
import { MaxCodePoints } from '../../../shared/http/max-code-points.js';
import {
  CASHBACK_AMOUNT_MAX_CENTS,
  CASHBACK_BPS_MAX,
  CASHBACK_MODES,
  CASHBACK_PAGE_MAX,
  CASHBACK_PAGE_SIZE,
  CASHBACK_PAGE_SIZE_MAX,
  CASHBACK_REASON_MAX,
  CASHBACK_REASON_MIN,
  CASHBACK_VALIDITY_DAYS_MAX,
} from '../cashback.constants.js';

/** The code a failed constraint answers, read by `ApiValidationPipe`. */
const answering = (errorCode: CashbackErrorCode) => ({ context: { errorCode } });
const SETTINGS = answering('CASHBACK_SETTINGS_INVALID');
const ADJUSTMENT = answering('CASHBACK_ADJUSTMENT_INVALID');

const trimmed = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** The whole of the rules: a form saves them together, and a key left out is refused rather than reset. */
export class CashbackSettingsDto implements CashbackSettingsPayload {
  @ApiProperty()
  @IsBoolean(SETTINGS)
  enabled!: boolean;

  @ApiProperty({ enum: CASHBACK_MODES, description: "STORE: one rate for every product. PRODUCT: each product's own, and one without earns nothing." })
  @IsIn(CASHBACK_MODES, SETTINGS)
  mode!: CashbackMode;

  @ApiProperty({ minimum: 1, maximum: CASHBACK_BPS_MAX, example: 500, description: 'Basis points of the products paid for (500 = 5.00%). Read on STORE; kept on PRODUCT.' })
  @IsInt(SETTINGS)
  @Min(1, SETTINGS)
  @Max(CASHBACK_BPS_MAX, SETTINGS)
  rateBps!: number;

  @ApiProperty({ nullable: true, type: Number, minimum: 1, maximum: CASHBACK_VALIDITY_DAYS_MAX, description: 'Days a credit stays usable once delivered; null never expires.' })
  // Null is a choice — no expiry — and so is sent; only a missing key is refused.
  @ValidateIf((_, value) => value !== null)
  @IsInt(SETTINGS)
  @Min(1, SETTINGS)
  @Max(CASHBACK_VALIDITY_DAYS_MAX, SETTINGS)
  expiresAfterDays!: number | null;

  @ApiProperty({ minimum: 0, maximum: CASHBACK_AMOUNT_MAX_CENTS, description: 'The products after discounts, in cents, an order must reach to earn; 0 is any.' })
  @IsInt(SETTINGS)
  @Min(0, SETTINGS)
  @Max(CASHBACK_AMOUNT_MAX_CENTS, SETTINGS)
  minSubtotalCents!: number;

  @ApiProperty({ minimum: 1, maximum: CASHBACK_BPS_MAX, example: 10000, description: 'Basis points of the products credit may pay for; never the delivery.' })
  @IsInt(SETTINGS)
  @Min(1, SETTINGS)
  @Max(CASHBACK_BPS_MAX, SETTINGS)
  maxRedeemBps!: number;
}

export class CashbackAdjustmentDto implements CashbackAdjustmentPayload {
  @ApiProperty({ minimum: -CASHBACK_AMOUNT_MAX_CENTS, maximum: CASHBACK_AMOUNT_MAX_CENTS, example: 1500, description: 'Cents, signed and never 0: positive gives credit, negative takes it.' })
  @IsInt(ADJUSTMENT)
  @NotEquals(0, ADJUSTMENT)
  @Min(-CASHBACK_AMOUNT_MAX_CENTS, ADJUSTMENT)
  @Max(CASHBACK_AMOUNT_MAX_CENTS, ADJUSTMENT)
  amountCents!: number;

  @ApiProperty({ minLength: CASHBACK_REASON_MIN, maxLength: CASHBACK_REASON_MAX, example: 'Pedido entregue com atraso' })
  @trimmed
  @IsString(ADJUSTMENT)
  @MinLength(CASHBACK_REASON_MIN, ADJUSTMENT)
  @MaxCodePoints(CASHBACK_REASON_MAX, ADJUSTMENT)
  reason!: string;
}

export class CustomerCashbackQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: CASHBACK_PAGE_MAX, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(CASHBACK_PAGE_MAX)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: CASHBACK_PAGE_SIZE_MAX, default: CASHBACK_PAGE_SIZE })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(CASHBACK_PAGE_SIZE_MAX)
  @Type(() => Number)
  pageSize?: number;
}
