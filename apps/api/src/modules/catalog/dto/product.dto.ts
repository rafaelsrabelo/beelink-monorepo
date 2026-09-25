// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

// Types
import type {
  CreateProductPayload,
  ProductImagePayload,
  ProductOrigin,
  ProductStatus,
  UpdateProductPayload,
} from '@harness-monorepo/contracts';

// App
import {
  DESCRIPTION_MAX_LENGTH,
  IMAGE_ALT_MAX_LENGTH,
  PARCEL_GRAMS_MAX,
  PARCEL_MM_MAX,
  PRICE_CENTS_MAX,
  PRODUCT_IMAGE_VALUES_MAX,
  PRODUCT_IMAGES_MAX,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_ORIGINS,
  PRODUCT_SLUG_MAX_LENGTH,
  PRODUCT_STATUSES,
  STOCK_MAX,
} from '../catalog.constants.js';
import { blankToNull, imageUrl, trim } from '../../stores/dto/store-fields.dto.js';

export class ProductImageDto implements ProductImagePayload {
  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/blusa.jpg' })
  @imageUrl
  url!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: IMAGE_ALT_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(IMAGE_ALT_MAX_LENGTH)
  @blankToNull
  alt?: string | null;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    maxItems: PRODUCT_IMAGE_VALUES_MAX,
    description: "Values of this product's options that the photo is of. Absent or empty: every combination.",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PRODUCT_IMAGE_VALUES_MAX)
  @IsUUID('all', { each: true })
  optionValueIds?: string[];
}

export class CreateProductDto implements CreateProductPayload {
  @ApiProperty({ example: 'Blusa Feminina Tomara Que Caia', minLength: 2, maxLength: PRODUCT_NAME_MAX_LENGTH })
  @IsString()
  @MinLength(2)
  @MaxLength(PRODUCT_NAME_MAX_LENGTH)
  @trim
  name!: string;

  @ApiPropertyOptional({
    example: 'blusa-feminina-tomara-que-caia',
    maxLength: PRODUCT_SLUG_MAX_LENGTH,
    description: 'Absent derives it from the name. Normalised either way.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(PRODUCT_SLUG_MAX_LENGTH)
  @trim
  slug?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: DESCRIPTION_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  @blankToNull
  description?: string | null;

  /**
   * Whole cents. `@Type(() => Number)` is declared because the global pipe deliberately runs without
   * `enableImplicitConversion` — see apps/api/AGENTS.md rule 6 — so a JSON number arrives typed but
   * a query string would not, and the annotation is what makes the two agree.
   */
  @ApiProperty({ example: 4990, minimum: 0, maximum: PRICE_CENTS_MAX, description: 'Whole cents.' })
  @IsInt()
  @Min(0)
  @Max(PRICE_CENTS_MAX)
  @Type(() => Number)
  priceCents!: number;

  @ApiPropertyOptional({
    example: 7990,
    nullable: true,
    description: 'What it cost before. Must be above priceCents; absent means no discount.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PRICE_CENTS_MAX)
  @Type(() => Number)
  compareAtPriceCents?: number | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  @blankToNull
  categoryId?: string | null;

  @ApiPropertyOptional({ enum: PRODUCT_STATUSES, default: 'ACTIVE' })
  @IsOptional()
  @IsIn(PRODUCT_STATUSES)
  status?: ProductStatus;

  @ApiPropertyOptional({ enum: PRODUCT_ORIGINS, nullable: true })
  @IsOptional()
  @IsIn(PRODUCT_ORIGINS)
  @blankToNull
  origin?: ProductOrigin | null;

  @ApiPropertyOptional({ nullable: true, description: 'Whole cents. Owner-only; never on the storefront.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PRICE_CENTS_MAX)
  @Type(() => Number)
  costCents?: number | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @blankToNull
  sku?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @blankToNull
  barcode?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @ApiPropertyOptional({ nullable: true, minimum: 0, description: 'Read only while trackStock.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(STOCK_MAX)
  @Type(() => Number)
  stockQuantity?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: PARCEL_GRAMS_MAX, description: 'Grams.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PARCEL_GRAMS_MAX)
  @Type(() => Number)
  weightGrams?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: PARCEL_MM_MAX, description: 'Millimetres.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PARCEL_MM_MAX)
  @Type(() => Number)
  lengthMm?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: PARCEL_MM_MAX, description: 'Millimetres.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PARCEL_MM_MAX)
  @Type(() => Number)
  widthMm?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: PARCEL_MM_MAX, description: 'Millimetres.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PARCEL_MM_MAX)
  @Type(() => Number)
  heightMm?: number | null;

  @ApiPropertyOptional({ type: [ProductImageDto], maxItems: PRODUCT_IMAGES_MAX })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PRODUCT_IMAGES_MAX)
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];
}

/**
 * Every field optional. Sending `images` replaces the gallery whole, in the order sent; omitting it
 * leaves the photos alone. That is the difference the service's comment spells out.
 */
export class UpdateProductDto extends CreateProductDto implements UpdateProductPayload {
  @ApiPropertyOptional({ minLength: 2, maxLength: PRODUCT_NAME_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(PRODUCT_NAME_MAX_LENGTH)
  @trim
  declare name: string;

  @ApiPropertyOptional({ minimum: 0, maximum: PRICE_CENTS_MAX, description: 'Whole cents.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PRICE_CENTS_MAX)
  @Type(() => Number)
  declare priceCents: number;
}
