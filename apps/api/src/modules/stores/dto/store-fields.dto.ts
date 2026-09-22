// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

// Types
import type { StoreAddressPayload, StoreColors, StoreSocialNetworksPayload } from '@harness-monorepo/contracts';

// App
import { HEX_COLOR } from '../stores.constants.js';

/**
 * The three nested objects the create and update bodies share, and the normalisations they run.
 * They live apart from the bodies so neither file grows past the length the root contract allows.
 */

export const trim = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value,
);

/** `''` and `null` meant the same thing in the legacy and both existed. Here only `null` does. */
export const blankToNull = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value,
);

/** A picture the storefront renders in `src`: anything but http(s) is a script waiting to run. */
export const imageUrl = IsUrl({ protocols: ['http', 'https'], require_protocol: true });

/**
 * `wa.me/<this>` is built from the stored value, so it has to carry the country code. Ten or eleven
 * digits is a Brazilian number typed without one — a product whose addresses are CEP and UF has no
 * other reading — and prepending 55 is what stops the link reaching nobody. The legacy stripped
 * punctuation at six call sites and prepended nothing.
 */
const normaliseWhatsapp = Transform(({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
});

/** A handle, never a URL and never the `@` a person types in front of it. */
const normaliseHandle = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/^@+/, '') || null : value,
);

/** The mask belongs to the field that accepts it; the column stores eight digits. */
const digitsOnly = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\D/g, '') || null : value,
);

const upperCase = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() || null : value,
);

/** Letters, digits and the punctuation the three networks allow — a `/` would mean a URL. */
const HANDLE = /^[A-Za-z0-9._-]+$/;

export class StoreColorsDto implements StoreColors {
  @ApiProperty({ example: '#FFFFFF', pattern: HEX_COLOR.source })
  @Matches(HEX_COLOR)
  background!: string;

  @ApiProperty({ example: '#3B7AF7', pattern: HEX_COLOR.source })
  @Matches(HEX_COLOR)
  primary!: string;

  @ApiProperty({ example: '#3B7AF7', pattern: HEX_COLOR.source })
  @Matches(HEX_COLOR)
  header!: string;

  @ApiProperty({
    example: '#3B7AF7',
    pattern: HEX_COLOR.source,
    description: "The foot. There is no text colour: every word is derived from what it sits on.",
  })
  @Matches(HEX_COLOR)
  footer!: string;
}

export class StoreSocialNetworksDto implements StoreSocialNetworksPayload {
  @ApiProperty({ example: '5511999998888', description: 'Digits, country code included. Required.' })
  @IsString()
  @Matches(/^\d{12,15}$/, { message: 'whatsapp must be digits, country code included' })
  @normaliseWhatsapp
  whatsapp!: string;

  @ApiPropertyOptional({ example: 'minhaloja', nullable: true })
  @IsOptional()
  @Matches(HANDLE)
  @MaxLength(120)
  @normaliseHandle
  instagram?: string | null;

  @ApiPropertyOptional({ example: 'minhaloja', nullable: true })
  @IsOptional()
  @Matches(HANDLE)
  @MaxLength(120)
  @normaliseHandle
  tiktok?: string | null;

  @ApiPropertyOptional({ example: 'https://open.spotify.com/user/minhaloja', nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @blankToNull
  spotify?: string | null;

  @ApiPropertyOptional({ example: 'minhaloja', nullable: true })
  @IsOptional()
  @Matches(HANDLE)
  @MaxLength(120)
  @normaliseHandle
  youtube?: string | null;
}

export class StoreAddressDto implements StoreAddressPayload {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @blankToNull
  street?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @blankToNull
  number?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @blankToNull
  complement?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @blankToNull
  neighborhood?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @blankToNull
  city?: string | null;

  @ApiPropertyOptional({ example: 'SP', nullable: true, description: 'The two-letter UF.' })
  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  @upperCase
  state?: string | null;

  @ApiPropertyOptional({ example: '01310930', nullable: true, description: 'CEP, eight digits, no mask.' })
  @IsOptional()
  @Matches(/^\d{8}$/)
  @digitsOnly
  zipCode?: string | null;
}
