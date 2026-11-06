// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
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
  ProductImportItemPayload,
  ProductImportOptionPayload,
  ProductImportPayload,
  ProductImportValuePayload,
} from '@harness-monorepo/contracts';

// App
import {
  CATEGORY_NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  OPTION_NAME_MAX_LENGTH,
  OPTION_VALUE_NAME_MAX_LENGTH,
  PRICE_CENTS_MAX,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_VARIANTS_MAX,
} from '../catalog.constants.js';
import { PRODUCT_IMPORT_MAX } from '../product-import.constants.js';
import { blankToNull, trim } from '../../stores/dto/store-fields.dto.js';

export class ProductImportValueDto implements ProductImportValuePayload {
  @ApiProperty({ example: 'Morango', maxLength: OPTION_VALUE_NAME_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(OPTION_VALUE_NAME_MAX_LENGTH)
  @trim
  name!: string;

  @ApiPropertyOptional({ nullable: true, example: 450, description: "Whole cents. Absent sells it at the product's price." })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PRICE_CENTS_MAX)
  @Type(() => Number)
  priceCents?: number | null;
}

export class ProductImportOptionDto implements ProductImportOptionPayload {
  @ApiProperty({ example: 'Sabor', maxLength: OPTION_NAME_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(OPTION_NAME_MAX_LENGTH)
  @trim
  name!: string;

  @ApiProperty({ type: [ProductImportValueDto], minItems: 1, maxItems: PRODUCT_VARIANTS_MAX })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PRODUCT_VARIANTS_MAX)
  @ValidateNested({ each: true })
  @Type(() => ProductImportValueDto)
  values!: ProductImportValueDto[];
}

export class ProductImportItemDto implements ProductImportItemPayload {
  @ApiProperty({ example: 'Dindin gourmet', minLength: 2, maxLength: PRODUCT_NAME_MAX_LENGTH })
  @IsString()
  @MinLength(2)
  @MaxLength(PRODUCT_NAME_MAX_LENGTH)
  @trim
  name!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: DESCRIPTION_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  @blankToNull
  description?: string | null;

  @ApiProperty({ example: 400, minimum: 0, maximum: PRICE_CENTS_MAX, description: 'Whole cents.' })
  @IsInt()
  @Min(0)
  @Max(PRICE_CENTS_MAX)
  @Type(() => Number)
  priceCents!: number;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'One of the shop\'s categories; wins over newCategoryName.' })
  @IsOptional()
  @IsUUID()
  @blankToNull
  categoryId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: CATEGORY_NAME_MAX_LENGTH,
    description: 'A category to create, shared by every item naming it; one the shop already has is reused.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(CATEGORY_NAME_MAX_LENGTH)
  @blankToNull
  newCategoryName?: string | null;

  @ApiPropertyOptional({ type: ProductImportOptionDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductImportOptionDto)
  option?: ProductImportOptionDto | null;
}

export class ProductImportDto implements ProductImportPayload {
  @ApiProperty({ type: [ProductImportItemDto], minItems: 1, maxItems: PRODUCT_IMPORT_MAX })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PRODUCT_IMPORT_MAX)
  @ValidateNested({ each: true })
  @Type(() => ProductImportItemDto)
  products!: ProductImportItemDto[];
}
