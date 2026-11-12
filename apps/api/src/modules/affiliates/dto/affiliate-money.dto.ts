// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min, MinLength, NotEquals, ValidateIf } from 'class-validator';

// Types
import type { AffiliateAdjustmentPayload, AffiliateErrorCode, AffiliatePayoutMethod, AffiliatePayoutPayload, OrderAffiliatePayload } from '@harness-monorepo/contracts';

// App
import { MaxCodePoints } from '../../../shared/http/max-code-points.js';
import {
  AFFILIATE_AMOUNT_MAX_CENTS,
  AFFILIATE_PAYOUT_METHODS,
  AFFILIATE_REASON_MAX,
  AFFILIATE_REASON_MIN,
  AFFILIATE_STATEMENT_PAGE_SIZE,
  AFFILIATE_STATEMENT_PAGE_SIZE_MAX,
  AFFILIATES_PAGE_MAX,
} from '../affiliates.constants.js';

/** The code a failed constraint answers, read by `ApiValidationPipe`. */
const answering = (errorCode: AffiliateErrorCode) => ({ context: { errorCode } });
const CHANGE = answering('AFFILIATE_ORDER_CHANGE_INVALID');
const ADJUSTMENT = answering('AFFILIATE_ADJUSTMENT_INVALID');
const PAYOUT = answering('AFFILIATE_PAYOUT_INVALID');
const STATEMENT = answering('AFFILIATE_INVALID');

const trimmed = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
const trimmedOrNull = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value));
const lowerCase = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toLowerCase() : value));

export class OrderAffiliateDto implements OrderAffiliatePayload {
  @ApiProperty({ nullable: true, type: String, format: 'uuid', description: 'The affiliate to credit it to; null credits nobody. Sent, never left out.' })
  @ValidateIf((_, value) => value !== null)
  @IsUUID(undefined, CHANGE)
  @lowerCase
  affiliateId!: string | null;

  @ApiProperty({ minLength: AFFILIATE_REASON_MIN, maxLength: AFFILIATE_REASON_MAX, example: 'Cliente veio pelo João e fechou no WhatsApp' })
  @trimmed
  @IsString(CHANGE)
  @MinLength(AFFILIATE_REASON_MIN, CHANGE)
  @MaxCodePoints(AFFILIATE_REASON_MAX, CHANGE)
  reason!: string;
}

export class AffiliateAdjustmentDto implements AffiliateAdjustmentPayload {
  @ApiProperty({ minimum: -AFFILIATE_AMOUNT_MAX_CENTS, maximum: AFFILIATE_AMOUNT_MAX_CENTS, example: -1500, description: 'Cents, signed and never 0: positive owes the affiliate more, negative less.' })
  @IsInt(ADJUSTMENT)
  @NotEquals(0, ADJUSTMENT)
  @Min(-AFFILIATE_AMOUNT_MAX_CENTS, ADJUSTMENT)
  @Max(AFFILIATE_AMOUNT_MAX_CENTS, ADJUSTMENT)
  amountCents!: number;

  @ApiProperty({ minLength: AFFILIATE_REASON_MIN, maxLength: AFFILIATE_REASON_MAX, example: 'Produto devolvido depois do pagamento' })
  @trimmed
  @IsString(ADJUSTMENT)
  @MinLength(AFFILIATE_REASON_MIN, ADJUSTMENT)
  @MaxCodePoints(AFFILIATE_REASON_MAX, ADJUSTMENT)
  reason!: string;
}

export class AffiliatePayoutDto implements AffiliatePayoutPayload {
  @ApiProperty({ minimum: 1, maximum: AFFILIATE_AMOUNT_MAX_CENTS, example: 21000, description: 'Up to what is available; more is AFFILIATE_PAYOUT_EXCEEDS_BALANCE.' })
  @IsInt(PAYOUT)
  @Min(1, PAYOUT)
  @Max(AFFILIATE_AMOUNT_MAX_CENTS, PAYOUT)
  amountCents!: number;

  @ApiProperty({ format: 'date', example: '2026-11-20', description: 'The day the shop paid, not after today in Brasília.' })
  @IsString(PAYOUT)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, PAYOUT)
  paidOn!: string;

  @ApiProperty({ enum: AFFILIATE_PAYOUT_METHODS })
  @IsIn(AFFILIATE_PAYOUT_METHODS, PAYOUT)
  method!: AffiliatePayoutMethod;

  @ApiProperty({ nullable: true, type: String, maxLength: AFFILIATE_REASON_MAX, description: 'Trimmed; blank or null is none.' })
  @trimmedOrNull
  // Null is a choice — no note — and so is sent; only a missing key is refused.
  @ValidateIf((_, value) => value !== null)
  @IsString(PAYOUT)
  @MaxCodePoints(AFFILIATE_REASON_MAX, PAYOUT)
  note!: string | null;
}

export class AffiliateStatementQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: AFFILIATES_PAGE_MAX, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt(STATEMENT)
  @Min(1, STATEMENT)
  @Max(AFFILIATES_PAGE_MAX, STATEMENT)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: AFFILIATE_STATEMENT_PAGE_SIZE_MAX, default: AFFILIATE_STATEMENT_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt(STATEMENT)
  @Min(1, STATEMENT)
  @Max(AFFILIATE_STATEMENT_PAGE_SIZE_MAX, STATEMENT)
  pageSize?: number;
}
