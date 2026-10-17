// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// Types
import type {
  CreateStorePayload,
  PaymentMethod,
  StoreLayoutSettings,
  StoreLayoutType,
  StoreType,
  UpdateStorePayload, OpeningTemplateId } from '@harness-monorepo/contracts';

// App
import { OPENING_TEMPLATE_IDS } from '../store-opening.js';
import { IsStoreLayoutSettings } from '../store-layout-settings.schema.js';
import {
  DESCRIPTION_MAX_LENGTH,
  INACTIVE_AFTER_DAYS_MAX,
  INACTIVE_AFTER_DAYS_MIN,
  PAYMENT_METHODS,
  SLUG_MAX_LENGTH,
  SLUG_MIN_LENGTH,
  STORE_LAYOUT_TYPES,
  STORE_TYPES,
} from '../stores.constants.js';
import { storeSlugField } from './store-slug.dto.js';
import {
  StoreAddressDto,
  StoreColorsDto,
  StoreSocialNetworksDto,
  blankToNull,
  imageUrl,
  trim,
} from './store-fields.dto.js';

export class CreateStoreDto implements CreateStorePayload {
  @ApiProperty({ example: 'Padaria do Bairro', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @trim
  name!: string;

  @ApiProperty({ example: 'padaria-do-bairro', minLength: SLUG_MIN_LENGTH, maxLength: SLUG_MAX_LENGTH })
  @storeSlugField()
  slug!: string;

  @ApiProperty({ enum: STORE_TYPES })
  @IsIn(STORE_TYPES)
  type!: StoreType;

  @ApiPropertyOptional({
    enum: OPENING_TEMPLATE_IDS,
    description: 'The model the home opens with. Absent — or one that is not for this type of store — a site opens with its first model and a shop with its default page.',
  })
  @IsOptional()
  @IsIn(OPENING_TEMPLATE_IDS)
  template?: OpeningTemplateId;

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

  @ApiPropertyOptional({ nullable: true, description: "The picture a browser draws in the shop's tab. Null or absent stores none, and the shop's pages declare the logo." })
  @IsOptional()
  @imageUrl
  @blankToNull
  faviconUrl?: string | null;

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
 * clears what is stored. `slug`, `latitude` and `longitude` are absent on purpose — the slug changes
 * by its own route alone (`ChangeStoreSlugDto`, BEELINK-331), which keeps its old address, and the
 * coordinates are the API's to compute — and `forbidNonWhitelisted` turns sending one into a 400
 * rather than a silent no-op.
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

  @ApiPropertyOptional({ nullable: true, description: "The picture a browser draws in the shop's tab. Null or absent stores none, and the shop's pages declare the logo." })
  @IsOptional()
  @imageUrl
  @blankToNull
  faviconUrl?: string | null;

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

  @ApiPropertyOptional({ minimum: INACTIVE_AFTER_DAYS_MIN, maximum: INACTIVE_AFTER_DAYS_MAX, description: 'Absent keeps what is stored.' })
  // Not `@IsOptional()`, which lets a null through to a NOT NULL column as a 500: absent is "keep
  // what is stored", and null is a client error.
  @ValidateIf((_dto: unknown, value: unknown) => value !== undefined)
  @IsInt()
  @Min(INACTIVE_AFTER_DAYS_MIN)
  @Max(INACTIVE_AFTER_DAYS_MAX)
  inactiveAfterDays?: number;
}
