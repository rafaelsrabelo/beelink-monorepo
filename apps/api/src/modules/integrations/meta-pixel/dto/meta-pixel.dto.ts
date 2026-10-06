// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

// Types
import type { IntegrationErrorCode, MetaPixelConnectPayload } from '@harness-monorepo/contracts';

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
