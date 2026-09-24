// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// Types
import type { ProductVariantPayload, UpdateProductVariantsPayload } from '@harness-monorepo/contracts';

// App
import {
  PARCEL_GRAMS_MAX,
  PARCEL_MM_MAX,
  PRICE_CENTS_MAX,
  PRODUCT_VARIANTS_MAX,
  STOCK_MAX,
} from '../catalog.constants.js';
import { blankToNull, imageUrl } from '../../stores/dto/store-fields.dto.js';

/** One variant's changes, with the same bounds a product's own fields have. */
export class ProductVariantDto implements ProductVariantPayload {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;

  @ApiPropertyOptional({ description: 'Off is "não vendo esta".' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 18900, minimum: 0, maximum: PRICE_CENTS_MAX, description: 'Whole cents.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PRICE_CENTS_MAX)
  @Type(() => Number)
  priceCents?: number;

  @ApiPropertyOptional({ nullable: true, description: 'Whole cents. Must be above priceCents.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PRICE_CENTS_MAX)
  @Type(() => Number)
  compareAtPriceCents?: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Whole cents. Owner-only.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PRICE_CENTS_MAX)
  @Type(() => Number)
  costCents?: number | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 64, description: 'Unique within the shop.' })
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: STOCK_MAX })
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

  @ApiPropertyOptional({ nullable: true, example: 'https://res.cloudinary.com/demo/image/upload/areia.jpg' })
  @IsOptional()
  @imageUrl
  @blankToNull
  imageUrl?: string | null;
}

export class UpdateProductVariantsDto implements UpdateProductVariantsPayload {
  @ApiProperty({ type: [ProductVariantDto], minItems: 1, maxItems: PRODUCT_VARIANTS_MAX })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PRODUCT_VARIANTS_MAX)
  @ArrayUnique((variant: ProductVariantDto) => variant.id)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants!: ProductVariantDto[];
}
