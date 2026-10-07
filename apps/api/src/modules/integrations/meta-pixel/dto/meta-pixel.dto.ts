// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

// Types
import type { IntegrationErrorCode, MetaPixelConnectPayload, MetaPixelTestEventPayload, MetaPixelTokenPayload } from '@harness-monorepo/contracts';

/**
 * Meta states no length for a pixel's ID; the ones it hands out today have 15 or 16 digits. The
 * range is wide on both sides on purpose: an older, shorter ID and a longer one to come still save,
 * while a phone number or an order number typed by mistake does not. The column's CHECK
 * (`store_integrations_pixel_id_check`) repeats it, so the two move together.
 */
export const META_PIXEL_ID_MIN = 10;
export const META_PIXEL_ID_MAX = 20;

/**
 * ASCII digits only — `\d` would also take the digits of other scripts under the `u` flag, and a
 * later change of flags must not widen what reaches a page. The ID is served to anyone in the
 * shop's public data, on a domain every shop shares: nothing but digits may get this far.
 */
export const META_PIXEL_ID = new RegExp(`^[0-9]{${META_PIXEL_ID_MIN},${META_PIXEL_ID_MAX}}$`);

const answering = { context: { errorCode: 'META_PIXEL_ID_INVALID' satisfies IntegrationErrorCode } };

export class MetaPixelConnectDto implements MetaPixelConnectPayload {
  @ApiProperty({ example: '1234567890123456', pattern: META_PIXEL_ID.source, description: "The pixel's ID as Meta's Events Manager shows it. Never a script." })
  // An ID copied from the Events Manager often carries the line break or the space around it.
  // Nothing else is mended: an ID with a letter or a dash inside is refused, not cleaned.
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString(answering)
  @Matches(META_PIXEL_ID, answering)
  pixelId!: string;
}

/** Meta states no shape for a token; the range refuses what is plainly none — a sentence, a pixel's ID — and nothing else. */
export const META_TOKEN_MIN = 20;
export const META_TOKEN_MAX = 1000;

const tokenAnswering = { context: { errorCode: 'META_PIXEL_TOKEN_INVALID' satisfies IntegrationErrorCode } };

export class MetaPixelTokenDto implements MetaPixelTokenPayload {
  @ApiProperty({ example: 'EAAB…', minLength: META_TOKEN_MIN, maxLength: META_TOKEN_MAX, description: "The pixel's Conversions API access token, as Meta's Events Manager generates it — sealed, and never answered back." })
  // A token pasted from the Events Manager often carries the line break or the space around it.
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString(tokenAnswering)
  @Length(META_TOKEN_MIN, META_TOKEN_MAX, tokenAnswering)
  // Visible ASCII only: an invisible character copied along would be refused by Meta as a token gone bad.
  @Matches(/^[\x21-\x7e]+$/, tokenAnswering)
  accessToken!: string;
}

const codeAnswering = { context: { errorCode: 'META_PIXEL_TEST_CODE_INVALID' satisfies IntegrationErrorCode } };

export class MetaPixelTestEventDto implements MetaPixelTestEventPayload {
  @ApiProperty({ example: 'TEST12345', description: 'The code Events Manager shows under "Test events".' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString(codeAnswering)
  @Matches(/^[A-Za-z0-9_-]{3,40}$/, codeAnswering)
  testEventCode!: string;
}
