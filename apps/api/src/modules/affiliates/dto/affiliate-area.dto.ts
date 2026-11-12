// Nest
import { ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, ValidateBy, buildMessage } from 'class-validator';

// Types
import type { AffiliateErrorCode, AffiliateProfilePayload } from '@harness-monorepo/contracts';

// App
import { MaxCodePoints } from '../../../shared/http/max-code-points.js';
import { normaliseWhatsapp } from '../../stores/dto/store-fields.dto.js';
import { pixKeyOf } from '../affiliate-pix-key.js';
import { AFFILIATES_PAGE_MAX, AFFILIATE_AREA_PAGE_SIZE_MAX, AFFILIATE_TAGLINE_MAX, PIX_KEY_MAX, PRODUCT_SEARCH_MAX } from '../affiliates.constants.js';

/** The code a failed constraint answers, read by `ApiValidationPipe`. */
const answering = (errorCode: AffiliateErrorCode) => ({ context: { errorCode } });
const PROFILE = answering('AFFILIATE_PROFILE_INVALID');

const trimmedOrNull = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value));

/** A key typed in any of the ways people write one, kept in the directory's shape; one of no shape stays as typed, and is refused. */
const normalisedPixKey = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? (value.trim() === '' ? null : (pixKeyOf(value) ?? value)) : value));

/** What the normaliser kept as a key: one already in the directory's shape. */
function IsPixKey(): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isPixKey',
      validator: {
        validate: (value: unknown) => typeof value === 'string' && pixKeyOf(value) === value,
        defaultMessage: buildMessage((each) => `${each}$property must be a Pix key: an e-mail, a random key, a phone, a CPF or a CNPJ`, PROFILE),
      },
    },
    PROFILE,
  );
}

/** Where the uploads route stores what it is given (`modules/uploads`): a photo on a shop's window comes from nowhere else. */
const UPLOADED_IMAGE = { protocols: ['https'], require_protocol: true, host_whitelist: ['res.cloudinary.com'] };

/** A patch: a key left out is left alone, and null clears it. */
export class AffiliateProfileDto implements AffiliateProfilePayload {
  @ApiPropertyOptional({ nullable: true, type: String, maxLength: PIX_KEY_MAX, example: '+55 (11) 98888-7777', description: "An e-mail, a random key, a phone, a CPF or a CNPJ, kept in the directory's shape." })
  @IsOptional()
  @normalisedPixKey
  @IsString(PROFILE)
  @MaxLength(PIX_KEY_MAX, PROFILE)
  @IsPixKey()
  pixKey?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: '(11) 98888-7777', description: 'Kept as digits with the country code; null clears it.' })
  @IsOptional()
  @normaliseWhatsapp
  @Matches(/^\d{12,15}$/, PROFILE)
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, description: 'An address the uploads route answered; null takes the photo off.' })
  @IsOptional()
  @IsUrl(UPLOADED_IMAGE, PROFILE)
  @MaxLength(2048, PROFILE)
  photoUrl?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, maxLength: AFFILIATE_TAGLINE_MAX, example: 'Separei meus favoritos aqui' })
  @IsOptional()
  @trimmedOrNull
  @IsString(PROFILE)
  @MaxCodePoints(AFFILIATE_TAGLINE_MAX, PROFILE)
  tagline?: string | null;
}

export class AffiliateAreaPageQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: AFFILIATES_PAGE_MAX, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(AFFILIATES_PAGE_MAX)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: AFFILIATE_AREA_PAGE_SIZE_MAX })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(AFFILIATE_AREA_PAGE_SIZE_MAX)
  pageSize?: number;
}

export class AffiliateProductQueryDto extends AffiliateAreaPageQueryDto {
  @ApiPropertyOptional({ maxLength: PRODUCT_SEARCH_MAX, description: "Part of the product's name." })
  @IsOptional()
  @trimmedOrNull
  @IsString()
  @MaxLength(PRODUCT_SEARCH_MAX)
  q?: string | null;
}
