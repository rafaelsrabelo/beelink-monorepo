// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsString, Max, Min, MinLength, ValidateIf } from 'class-validator';

// Types
import type { AffiliateErrorCode, AffiliateProgramPayload, CommissionCategoryRatePayload, CommissionProductRatePayload, CommissionTablePayload } from '@harness-monorepo/contracts';

// App
import { MaxCodePoints } from '../../../shared/http/max-code-points.js';
import {
  ATTRIBUTION_DAYS_MAX,
  ATTRIBUTION_DAYS_MIN,
  COMMISSION_BPS_MAX,
  COMMISSION_TABLE_NAME_MAX,
  PAYOUT_DELAY_DAYS_MAX,
  TERMS_TEXT_MAX,
} from '../affiliates.constants.js';

/** The code a failed constraint answers, read by `ApiValidationPipe`. */
const answering = (errorCode: AffiliateErrorCode) => ({ context: { errorCode } });
const PROGRAM = answering('AFFILIATE_PROGRAM_INVALID');
const TABLE = answering('COMMISSION_TABLE_INVALID');

const trimmed = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
/** Terms of only blanks are no terms. */
const trimmedOrNull = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value));

/** The whole of the rules: a form saves them together, and a key left out is refused rather than reset. */
export class AffiliateProgramDto implements AffiliateProgramPayload {
  @ApiProperty()
  @IsBoolean(PROGRAM)
  enabled!: boolean;

  @ApiProperty({ minimum: ATTRIBUTION_DAYS_MIN, maximum: ATTRIBUTION_DAYS_MAX, example: 30, description: "Days a visit through an affiliate's link credits the orders that follow it." })
  @IsInt(PROGRAM)
  @Min(ATTRIBUTION_DAYS_MIN, PROGRAM)
  @Max(ATTRIBUTION_DAYS_MAX, PROGRAM)
  attributionDays!: number;

  @ApiProperty({ minimum: 0, maximum: PAYOUT_DELAY_DAYS_MAX, example: 10, description: 'Days after a payout period closes that its commissions fall due.' })
  @IsInt(PROGRAM)
  @Min(0, PROGRAM)
  @Max(PAYOUT_DELAY_DAYS_MAX, PROGRAM)
  payoutDelayDays!: number;

  @ApiProperty({ nullable: true, type: String, maxLength: TERMS_TEXT_MAX, description: 'Trimmed; blank or null is no terms. A different text moves `termsVersion` up by one.' })
  @trimmedOrNull
  // Null is a choice — no terms — and so is sent; only a missing key is refused.
  @ValidateIf((_, value) => value !== null)
  @IsString(PROGRAM)
  @MaxCodePoints(TERMS_TEXT_MAX, PROGRAM)
  termsText!: string | null;
}

export class CommissionTableDto implements CommissionTablePayload {
  @ApiProperty({ minLength: 1, maxLength: COMMISSION_TABLE_NAME_MAX, example: 'Influencers' })
  @trimmed
  @IsString(TABLE)
  @MinLength(1, TABLE)
  @MaxCodePoints(COMMISSION_TABLE_NAME_MAX, TABLE)
  name!: string;

  @ApiProperty({ minimum: 0, maximum: COMMISSION_BPS_MAX, example: 1500, description: 'Basis points of what the customer paid for a product (1500 = 15.00%).' })
  @IsInt(TABLE)
  @Min(0, TABLE)
  @Max(COMMISSION_BPS_MAX, TABLE)
  defaultRateBps!: number;
}

export class CommissionProductRateDto implements CommissionProductRatePayload {
  @ApiProperty({ minimum: 0, maximum: COMMISSION_BPS_MAX, example: 0, description: "Replaces the table's rate for this product; 0 pays it nothing." })
  @IsInt(TABLE)
  @Min(0, TABLE)
  @Max(COMMISSION_BPS_MAX, TABLE)
  rateBps!: number;
}

export class CommissionCategoryRateDto implements CommissionCategoryRatePayload {
  @ApiProperty({ minimum: 0, maximum: COMMISSION_BPS_MAX, example: 1500, description: "Replaces the table's rate for the category's products that have no rate of their own; 0 pays them nothing." })
  @IsInt(TABLE)
  @Min(0, TABLE)
  @Max(COMMISSION_BPS_MAX, TABLE)
  rateBps!: number;
}
