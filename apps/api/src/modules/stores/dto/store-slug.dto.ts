// Nest
import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Types
import type { ChangeStoreSlugPayload, StoreErrorCode, StoreSlugAvailability, StoreSlugMove, StoreSlugUnavailableReason } from '@harness-monorepo/contracts';

// App
import { normaliseSlugText } from '../store-slugs.js';
import { SLUG_MAX_LENGTH, SLUG_MIN_LENGTH, SLUG_PATTERN } from '../stores.constants.js';

/** The legacy `generateSlug()`, plus trimming the hyphens it could leave at either end. */
const normaliseSlug = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? normaliseSlugText(value) : value));

/**
 * A page's address as a body brings it: normalised, then held to the rules — one decorator, so the
 * address a page is created with and the one it changes to (BEELINK-331) are the same thing.
 * `errorCode` names what a refusal answers; absent, the validation's own `BAD_REQUEST`.
 */
export function storeSlugField(errorCode?: StoreErrorCode): PropertyDecorator {
  const options = errorCode ? { context: { errorCode } } : {};
  return applyDecorators(IsString(options), Matches(SLUG_PATTERN, options), MinLength(SLUG_MIN_LENGTH, options), MaxLength(SLUG_MAX_LENGTH, options), normaliseSlug);
}

export class ChangeStoreSlugDto implements ChangeStoreSlugPayload {
  @ApiProperty({ example: 'padaria-da-esquina', minLength: SLUG_MIN_LENGTH, maxLength: SLUG_MAX_LENGTH, description: 'Normalised as on creation: "Padaria da Esquina" is padaria-da-esquina.' })
  @storeSlugField('STORE_SLUG_INVALID')
  slug!: string;
}

/**
 * What is asked of an address before it is chosen. Only normalised and bounded here: whether it is
 * one at all is the answer's `INVALID`, not a 400 — the screen asks while it is being typed.
 */
export class StoreSlugAvailabilityQueryDto {
  @ApiProperty({ example: 'Padaria da Esquina' })
  @IsString()
  @MaxLength(200)
  @normaliseSlug
  slug!: string;
}

const UNAVAILABLE_REASONS = ['INVALID', 'RESERVED', 'TAKEN', 'UNCHANGED'] as const satisfies readonly StoreSlugUnavailableReason[];

export class StoreSlugAvailabilityResponse implements StoreSlugAvailability {
  @ApiProperty({ example: 'padaria-da-esquina', description: 'As the API would store it.' }) slug!: string;
  @ApiProperty() available!: boolean;
  @ApiProperty({ nullable: true, enum: UNAVAILABLE_REASONS, type: String }) reason!: StoreSlugUnavailableReason | null;
}

export class StoreSlugMoveResponse implements StoreSlugMove {
  @ApiProperty({ example: 'padaria-do-bairo', description: 'An address a page left.' }) from!: string;
  @ApiProperty({ example: 'padaria-do-bairro', description: 'The address that page has now.' }) to!: string;
}
