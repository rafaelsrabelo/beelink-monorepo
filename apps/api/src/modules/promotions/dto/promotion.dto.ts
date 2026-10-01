// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDate, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxDate, MaxLength, Min, MinDate } from 'class-validator';

// Types
import type {
  CouponKind,
  CouponListQuery,
  CouponPayload,
  CouponRedemptionListQuery,
  CouponStatus,
  DiscountKind,
  PromotionErrorCode,
  PromotionListQuery,
  PromotionPayload,
  PromotionScope,
  PromotionStatus,
  SetDiscountActivePayload,
} from '@harness-monorepo/contracts';

// App
import { blankToNull } from '../../stores/dto/store-fields.dto.js';
import {
  COUPON_CODE,
  COUPON_KINDS,
  COUPON_MAX_USES_MAX,
  COUPON_MAX_USES_PER_CUSTOMER_MAX,
  COUPON_STATUSES,
  DISCOUNT_AMOUNT_MAX_CENTS,
  DISCOUNT_KINDS,
  DISCOUNTS_PAGE_MAX,
  DISCOUNTS_PAGE_SIZE,
  DISCOUNTS_PAGE_SIZE_MAX,
  PERCENT_BPS_MAX,
  PERIOD_MAX,
  PERIOD_MIN,
  PROMOTION_NAME_MAX,
  PROMOTION_SCOPES,
  PROMOTION_STATUSES,
  PROMOTION_TARGETS_MAX,
} from '../promotions.constants.js';

/** The code a failed constraint answers, read by `ApiValidationPipe`. */
const answering = (errorCode: PromotionErrorCode) => ({ context: { errorCode } });

const trimmed = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
/** As it is stored, so "bemvindo10" and "BEMVINDO10" are one code before any rule reads it. */
const upperCased = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value));

/** Dates arrive as ISO-8601 strings and are held as `Date`s from the pipe on. */
type Dated<T> = Omit<T, 'startsAt' | 'endsAt'>;

export class PromotionDto implements Dated<PromotionPayload> {
  @ApiProperty({ maxLength: PROMOTION_NAME_MAX, example: 'Semana do Consumidor' })
  @trimmed
  @IsString()
  @IsNotEmpty()
  @MaxLength(PROMOTION_NAME_MAX)
  name!: string;

  @ApiProperty({ enum: PROMOTION_SCOPES })
  @IsIn(PROMOTION_SCOPES)
  scope!: PromotionScope;

  @ApiProperty({ enum: DISCOUNT_KINDS })
  @IsIn(DISCOUNT_KINDS)
  discountKind!: DiscountKind;

  @ApiPropertyOptional({ nullable: true, type: Number, minimum: 1, maximum: PERCENT_BPS_MAX, example: 1000, description: 'Basis points (1000 = 10.00%), on a PERCENT; absent otherwise.' })
  @IsOptional()
  @IsInt(answering('PROMOTION_DISCOUNT_INVALID'))
  @Min(1, answering('PROMOTION_DISCOUNT_INVALID'))
  @Max(PERCENT_BPS_MAX, answering('PROMOTION_DISCOUNT_INVALID'))
  percentBps?: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number, minimum: 1, maximum: DISCOUNT_AMOUNT_MAX_CENTS, description: 'Whole cents, on a FIXED; absent otherwise.' })
  @IsOptional()
  @IsInt(answering('PROMOTION_DISCOUNT_INVALID'))
  @Min(1, answering('PROMOTION_DISCOUNT_INVALID'))
  @Max(DISCOUNT_AMOUNT_MAX_CENTS, answering('PROMOTION_DISCOUNT_INVALID'))
  amountCents?: number | null;

  @ApiProperty({ format: 'date-time' })
  @Type(() => Date)
  @IsDate(answering('PROMOTION_PERIOD_INVALID'))
  @MinDate(PERIOD_MIN, answering('PROMOTION_PERIOD_INVALID'))
  @MaxDate(PERIOD_MAX, answering('PROMOTION_PERIOD_INVALID'))
  startsAt!: Date;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time', description: 'After startsAt; absent or null runs until paused.' })
  @IsOptional()
  @Type(() => Date)
  @IsDate(answering('PROMOTION_PERIOD_INVALID'))
  @MaxDate(PERIOD_MAX, answering('PROMOTION_PERIOD_INVALID'))
  endsAt?: Date | null;

  @ApiPropertyOptional({ default: true, description: 'False is paused.' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: [String], format: 'uuid', maxItems: PROMOTION_TARGETS_MAX, description: 'The products of a PRODUCTS scope; absent or empty otherwise.' })
  @IsOptional()
  @IsArray(answering('PROMOTION_TARGETS_INVALID'))
  @ArrayMaxSize(PROMOTION_TARGETS_MAX, answering('PROMOTION_TARGETS_INVALID'))
  @IsUUID(undefined, { each: true, ...answering('PROMOTION_TARGETS_INVALID') })
  productIds?: string[];

  @ApiPropertyOptional({ type: [String], format: 'uuid', maxItems: PROMOTION_TARGETS_MAX, description: 'The categories of a CATEGORIES scope; absent or empty otherwise.' })
  @IsOptional()
  @IsArray(answering('PROMOTION_TARGETS_INVALID'))
  @ArrayMaxSize(PROMOTION_TARGETS_MAX, answering('PROMOTION_TARGETS_INVALID'))
  @IsUUID(undefined, { each: true, ...answering('PROMOTION_TARGETS_INVALID') })
  categoryIds?: string[];
}

export class CouponDto implements Dated<CouponPayload> {
  @ApiProperty({ example: 'BEMVINDO10', description: '3 to 30 of A–Z, 0–9, "-" and "_", starting with a letter or a digit; stored in upper case.' })
  @upperCased
  @IsString(answering('COUPON_CODE_INVALID'))
  @Matches(COUPON_CODE, answering('COUPON_CODE_INVALID'))
  code!: string;

  @ApiProperty({ enum: COUPON_KINDS })
  @IsIn(COUPON_KINDS)
  kind!: CouponKind;

  @ApiPropertyOptional({ nullable: true, type: Number, minimum: 1, maximum: PERCENT_BPS_MAX, example: 1000, description: 'Basis points (1000 = 10.00%), on a PERCENT; absent otherwise.' })
  @IsOptional()
  @IsInt(answering('COUPON_DISCOUNT_INVALID'))
  @Min(1, answering('COUPON_DISCOUNT_INVALID'))
  @Max(PERCENT_BPS_MAX, answering('COUPON_DISCOUNT_INVALID'))
  percentBps?: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number, minimum: 1, maximum: DISCOUNT_AMOUNT_MAX_CENTS, description: 'Whole cents, on a FIXED; absent otherwise.' })
  @IsOptional()
  @IsInt(answering('COUPON_DISCOUNT_INVALID'))
  @Min(1, answering('COUPON_DISCOUNT_INVALID'))
  @Max(DISCOUNT_AMOUNT_MAX_CENTS, answering('COUPON_DISCOUNT_INVALID'))
  amountCents?: number | null;

  @ApiPropertyOptional({ minimum: 0, maximum: DISCOUNT_AMOUNT_MAX_CENTS, default: 0, description: "The cart's subtotal it asks for; zero asks for none." })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(DISCOUNT_AMOUNT_MAX_CENTS)
  minSubtotalCents?: number;

  @ApiProperty({ format: 'date-time' })
  @Type(() => Date)
  @IsDate(answering('COUPON_PERIOD_INVALID'))
  @MinDate(PERIOD_MIN, answering('COUPON_PERIOD_INVALID'))
  @MaxDate(PERIOD_MAX, answering('COUPON_PERIOD_INVALID'))
  startsAt!: Date;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time', description: 'After startsAt; absent or null never expires.' })
  @IsOptional()
  @Type(() => Date)
  @IsDate(answering('COUPON_PERIOD_INVALID'))
  @MaxDate(PERIOD_MAX, answering('COUPON_PERIOD_INVALID'))
  endsAt?: Date | null;

  @ApiPropertyOptional({ nullable: true, type: Number, minimum: 1, maximum: COUPON_MAX_USES_MAX, description: 'How many orders may use it; absent or null is no limit.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(COUPON_MAX_USES_MAX)
  maxUses?: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number, minimum: 1, maximum: COUPON_MAX_USES_PER_CUSTOMER_MAX, description: "How many of one customer's orders may use it; absent or null is no limit." })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(COUPON_MAX_USES_PER_CUSTOMER_MAX)
  maxUsesPerCustomer?: number | null;

  @ApiPropertyOptional({ default: true, description: 'False is paused.' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class SetDiscountActiveDto implements SetDiscountActivePayload {
  @ApiProperty({ description: 'False pauses it; true switches it back on.' })
  @IsBoolean()
  active!: boolean;
}

// `@Type(() => Number)` and not the pipe's implicit conversion — apps/api/AGENTS.md, rule 6.
class DiscountPageDto implements CouponRedemptionListQuery {
  @ApiPropertyOptional({ minimum: 1, maximum: DISCOUNTS_PAGE_MAX, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(DISCOUNTS_PAGE_MAX)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: DISCOUNTS_PAGE_SIZE_MAX, default: DISCOUNTS_PAGE_SIZE })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(DISCOUNTS_PAGE_SIZE_MAX)
  @Type(() => Number)
  pageSize?: number;
}

export class PromotionListDto extends DiscountPageDto implements PromotionListQuery {
  @ApiPropertyOptional({ enum: PROMOTION_STATUSES, description: 'Absent is every one.' })
  @IsOptional()
  @blankToNull
  @IsIn(PROMOTION_STATUSES)
  status?: PromotionStatus;
}

export class CouponListDto extends DiscountPageDto implements CouponListQuery {
  @ApiPropertyOptional({ enum: COUPON_STATUSES, description: 'Absent is every one.' })
  @IsOptional()
  @blankToNull
  @IsIn(COUPON_STATUSES)
  status?: CouponStatus;
}

export class CouponRedemptionListDto extends DiscountPageDto {}
