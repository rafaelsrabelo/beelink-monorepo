// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

// Types
import type {
  AffiliateAcceptancePayload,
  AffiliateErrorCode,
  AffiliateSignUpPayload,
  AffiliateStatus,
  CreateAffiliatePayload,
  UpdateAffiliatePayload,
} from '@harness-monorepo/contracts';

// App
import { IsCpf, cpfDigitsOf } from '../../../shared/http/cpf.js';
import { MaxCodePoints } from '../../../shared/http/max-code-points.js';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../auth/auth.constants.js';
import { normaliseWhatsapp } from '../../stores/dto/store-fields.dto.js';
import {
  AFFILIATE_NAME_MAX,
  AFFILIATE_NAME_MIN,
  AFFILIATE_NOTE_MAX,
  AFFILIATE_STATUSES,
  AFFILIATES_PAGE_MAX,
  AFFILIATES_PAGE_SIZE,
  AFFILIATES_PAGE_SIZE_MAX,
  PIX_KEY_MAX,
} from '../affiliates.constants.js';

/** The code a failed constraint answers, read by `ApiValidationPipe`. */
const answering = (errorCode: AffiliateErrorCode) => ({ context: { errorCode } });
const AFFILIATE = answering('AFFILIATE_INVALID');
const ACCEPTANCE = answering('AFFILIATE_ACCEPTANCE_INVALID');

const trimmed = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
const trimmedOrNull = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value));
/** A CPF is kept as its eleven digits, whichever points and dash were typed around them. */
const cpfDigits = Transform(({ value }: { value: unknown }) => cpfDigitsOf(value));
/** An e-mail is compared without case or surrounding spaces, as the accounts compare it. */
const normalisedEmail = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
/** The longest an address may be, by the standard: the column is as wide. */
const EMAIL_MAX = 254;
/** What anyone types for a `/name` before it is normalised: past this, not a name. */
const SLUG_INPUT_MAX = 80;

export class CreateAffiliateDto implements CreateAffiliatePayload {
  @ApiProperty({ example: 'João Silva', minLength: AFFILIATE_NAME_MIN, maxLength: AFFILIATE_NAME_MAX })
  @trimmed
  @IsString(AFFILIATE)
  @MinLength(AFFILIATE_NAME_MIN, AFFILIATE)
  @MaxCodePoints(AFFILIATE_NAME_MAX, AFFILIATE)
  name!: string;

  @ApiProperty({ example: 'joao@exemplo.com', description: 'Where the invite goes, and the one account that may accept it.' })
  @normalisedEmail
  @IsEmail({}, AFFILIATE)
  @MaxLength(EMAIL_MAX, AFFILIATE)
  email!: string;

  @ApiProperty({ format: 'uuid', description: "One of the shop's commission tables." })
  @IsUUID('all', AFFILIATE)
  tableId!: string;

  @ApiProperty({ example: '(11) 99999-8888', description: 'Required (the user\'s review, 12/11/2026). Kept as digits with the country code.' })
  @normaliseWhatsapp
  @IsString(AFFILIATE)
  @Matches(/^\d{12,15}$/, AFFILIATE)
  phone!: string;

  @ApiProperty({ example: '529.982.247-25', description: 'Required, and checked. Kept as its eleven digits; the shop\'s alone to read.' })
  @cpfDigits
  @IsString(AFFILIATE)
  @IsCpf(AFFILIATE)
  cpf!: string;

  @ApiPropertyOptional({ nullable: true, type: String, maxLength: AFFILIATE_NOTE_MAX, description: "The shop's own; the affiliate never reads it." })
  @IsOptional()
  @trimmedOrNull
  @ValidateIf((_, value) => value !== null)
  @IsString(AFFILIATE)
  @MaxCodePoints(AFFILIATE_NOTE_MAX, AFFILIATE)
  note?: string | null;
}

/** A patch: a key left out is left alone, and a null note clears it. The phone and the CPF are corrected, never cleared. */
export class UpdateAffiliateDto implements UpdateAffiliatePayload {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', AFFILIATE)
  tableId?: string;

  @ApiPropertyOptional({ example: '(11) 99999-8888' })
  // Left out is left alone; null is refused — the phone and the CPF are corrected, never cleared.
  @ValidateIf((_, value) => value !== undefined)
  @normaliseWhatsapp
  @IsString(AFFILIATE)
  @Matches(/^\d{12,15}$/, AFFILIATE)
  phone?: string;

  @ApiPropertyOptional({ example: '529.982.247-25' })
  @ValidateIf((_, value) => value !== undefined)
  @cpfDigits
  @IsString(AFFILIATE)
  @IsCpf(AFFILIATE)
  cpf?: string;

  @ApiPropertyOptional({ nullable: true, type: String, maxLength: AFFILIATE_NOTE_MAX })
  @trimmedOrNull
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString(AFFILIATE)
  @MaxCodePoints(AFFILIATE_NOTE_MAX, AFFILIATE)
  note?: string | null;
}

export class AffiliateListQueryDto {
  @ApiPropertyOptional({ enum: AFFILIATE_STATUSES })
  @IsOptional()
  @IsIn(AFFILIATE_STATUSES, AFFILIATE)
  status?: AffiliateStatus;

  @ApiPropertyOptional({ minimum: 1, maximum: AFFILIATES_PAGE_MAX, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt(AFFILIATE)
  @Min(1, AFFILIATE)
  @Max(AFFILIATES_PAGE_MAX, AFFILIATE)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: AFFILIATES_PAGE_SIZE_MAX, default: AFFILIATES_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt(AFFILIATE)
  @Min(1, AFFILIATE)
  @Max(AFFILIATES_PAGE_SIZE_MAX, AFFILIATE)
  pageSize?: number;
}

export class AffiliateSlugQueryDto {
  @ApiProperty({ example: 'joao', description: 'Any way it is typed; the answer says how it would be kept.' })
  @IsString(ACCEPTANCE)
  @MaxLength(SLUG_INPUT_MAX, ACCEPTANCE)
  slug!: string;
}

export class AffiliateAcceptanceDto implements AffiliateAcceptancePayload {
  @ApiProperty({ example: 'joao', description: 'Normalised as a category slug is; 3 to 40 characters once it is.' })
  @IsString(ACCEPTANCE)
  @MaxLength(SLUG_INPUT_MAX, ACCEPTANCE)
  slug!: string;

  @ApiProperty({ nullable: true, type: String, maxLength: PIX_KEY_MAX, description: 'Trimmed; blank or null to give it later.' })
  @trimmedOrNull
  // Null is a choice — later — and so is sent; only a missing key is refused.
  @ValidateIf((_, value) => value !== null)
  @IsString(ACCEPTANCE)
  @MaxCodePoints(PIX_KEY_MAX, ACCEPTANCE)
  pixKey!: string | null;

  @ApiProperty({ minimum: 0, description: "The `terms.version` the invite showed: the shop's terms as they were read." })
  @IsInt(ACCEPTANCE)
  @Min(0, ACCEPTANCE)
  termsVersion!: number;
}

export class AffiliateSignUpDto extends AffiliateAcceptanceDto implements AffiliateSignUpPayload {
  @ApiProperty({ example: 'João Silva', minLength: AFFILIATE_NAME_MIN, maxLength: AFFILIATE_NAME_MAX, description: "The new account's name." })
  @trimmed
  @IsString(ACCEPTANCE)
  @MinLength(AFFILIATE_NAME_MIN, ACCEPTANCE)
  @MaxLength(AFFILIATE_NAME_MAX, ACCEPTANCE)
  name!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsString(ACCEPTANCE)
  @MinLength(PASSWORD_MIN_LENGTH, ACCEPTANCE)
  @MaxLength(PASSWORD_MAX_LENGTH, ACCEPTANCE)
  password!: string;
}
