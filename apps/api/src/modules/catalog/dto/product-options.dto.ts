// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

// Types
import type {
  ProductOptionPayload,
  ProductOptionValuePayload,
  ReplaceProductOptionsPayload,
} from '@harness-monorepo/contracts';

// App
import {
  OPTION_NAME_MAX_LENGTH,
  OPTION_VALUE_NAME_MAX_LENGTH,
  PRODUCT_OPTIONS_MAX,
  PRODUCT_VARIANTS_MAX,
} from '../catalog.constants.js';
import { blankToNull, trim } from '../../stores/dto/store-fields.dto.js';

export class ProductOptionValueDto implements ProductOptionValuePayload {
  @ApiPropertyOptional({ format: 'uuid', description: 'Absent adds a value; present renames that one.' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: 'Areia', maxLength: OPTION_VALUE_NAME_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(OPTION_VALUE_NAME_MAX_LENGTH)
  @trim
  name!: string;

  @ApiPropertyOptional({ nullable: true, example: '#d9c7a7', pattern: '^#[0-9a-fA-F]{6}$' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-f]{6}$/i)
  @blankToNull
  colorHex?: string | null;
}

export class ProductOptionDto implements ProductOptionPayload {
  @ApiPropertyOptional({ format: 'uuid', description: 'Absent adds an option; present is that one.' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: 'Tamanho', maxLength: OPTION_NAME_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(OPTION_NAME_MAX_LENGTH)
  @trim
  name!: string;

  @ApiProperty({ type: [ProductOptionValueDto], minItems: 1, maxItems: PRODUCT_VARIANTS_MAX })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PRODUCT_VARIANTS_MAX)
  @ValidateNested({ each: true })
  @Type(() => ProductOptionValueDto)
  values!: ProductOptionValueDto[];
}

export class ReplaceProductOptionsDto implements ReplaceProductOptionsPayload {
  @ApiProperty({ type: [ProductOptionDto], maxItems: PRODUCT_OPTIONS_MAX, description: 'Whole and in order.' })
  @IsArray()
  @ArrayMaxSize(PRODUCT_OPTIONS_MAX)
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  options!: ProductOptionDto[];
}
