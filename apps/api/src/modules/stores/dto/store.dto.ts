// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidateNested,
} from 'class-validator';

// Types
import type {
  CreateStorePayload,
  PaymentMethod,
  StoreLayoutSettings,
  StoreLayoutType,
  StoreType,
  UpdateStorePayload,
} from '@harness-monorepo/contracts';

// App
import { IsStoreLayoutSettings } from '../store-layout-settings.schema.js';
import {
  DESCRIPTION_MAX_LENGTH,
  PAYMENT_METHODS,
  SLUG_MAX_LENGTH,
  SLUG_MIN_LENGTH,
  SLUG_PATTERN,
  STORE_LAYOUT_TYPES,
  STORE_TYPES,
} from '../stores.constants.js';
import {
  StoreAddressDto,
  StoreColorsDto,
  StoreSocialNetworksDto,
  blankToNull,
  imageUrl,
  trim,
} from './store-fields.dto.js';

/** The legacy `generateSlug()`, plus trimming the hyphens it could leave at either end. */
const normaliseSlug = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : value,
);

export class CreateStoreDto implements CreateStorePayload {
  @ApiProperty({ example: 'Padaria do Bairro', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @trim
  name!: string;

  @ApiProperty({ example: 'padaria-do-bairro', minLength: SLUG_MIN_LENGTH, maxLength: SLUG_MAX_LENGTH })
  @IsString()
  @Matches(SLUG_PATTERN)
  @MinLength(SLUG_MIN_LENGTH)
  @MaxLength(SLUG_MAX_LENGTH)
  @normaliseSlug
  slug!: string;

  @ApiProperty({ enum: STORE_TYPES })
  @IsIn(STORE_TYPES)
  type!: StoreType;

  @ApiPropertyOptional({ nullable: true, maxLength: DESCRIPTION_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  @blankToNull
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @imageUrl
  @blankToNull
  logoUrl?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  @blankToNull
  categoryId?: string | null;

  @ApiPropertyOptional({ type: StoreColorsDto, description: 'Omitted means the platform default theme.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => StoreColorsDto)
  colors?: StoreColorsDto;

  @ApiProperty({ type: StoreSocialNetworksDto })
  @ValidateNested()
  @Type(() => StoreSocialNetworksDto)
  socialNetworks!: StoreSocialNetworksDto;

  @ApiPropertyOptional({ type: StoreAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StoreAddressDto)
  address?: StoreAddressDto;
}

/**
 * A full replacement, not a patch: the panel posts every field it edits, so an omitted optional key
 * clears what is stored. `slug`, `latitude` and `longitude` are absent on purpose — the slug is
 * immutable and the coordinates are the API's to compute — and `forbidNonWhitelisted` turns sending
 * one into a 400 rather than a silent no-op.
 */
export class UpdateStoreDto implements UpdateStorePayload {
  @ApiProperty({ minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @trim
  name!: string;

  @ApiProperty({ enum: STORE_TYPES })
  @IsIn(STORE_TYPES)
  type!: StoreType;

  @ApiPropertyOptional({ nullable: true, maxLength: DESCRIPTION_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_MAX_LENGTH)
  @blankToNull
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @imageUrl
  @blankToNull
  logoUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @imageUrl
  @blankToNull
  bannerImageUrl?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  @blankToNull
  categoryId?: string | null;

  @ApiProperty({ enum: STORE_LAYOUT_TYPES })
  @IsIn(STORE_LAYOUT_TYPES)
  layoutType!: StoreLayoutType;

  @ApiProperty()
  @IsBoolean()
  showProductsByCategory!: boolean;

  @ApiProperty({ type: StoreColorsDto })
  @ValidateNested()
  @Type(() => StoreColorsDto)
  colors!: StoreColorsDto;

  @ApiProperty({ type: StoreSocialNetworksDto })
  @ValidateNested()
  @Type(() => StoreSocialNetworksDto)
  socialNetworks!: StoreSocialNetworksDto;

  @ApiPropertyOptional({ type: StoreAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StoreAddressDto)
  address?: StoreAddressDto;

  @ApiPropertyOptional({ type: 'object', additionalProperties: false, description: 'StoreLayoutSettings' })
  @IsOptional()
  @Validate(IsStoreLayoutSettings)
  layoutSettings?: StoreLayoutSettings;

  @ApiProperty({ enum: PAYMENT_METHODS, isArray: true, minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(PAYMENT_METHODS, { each: true })
  paymentMethods!: PaymentMethod[];
}
