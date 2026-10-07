// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

// Types
import type { GoogleAnalyticsConnectPayload, IntegrationErrorCode } from '@harness-monorepo/contracts';

/**
 * Google states no length for a measurement ID; the ones it hands out today have 10 characters
 * after the `G-`. The range is wide on both sides on purpose: a shorter and a longer one still
 * save, while a word typed by mistake does not. The column's CHECK
 * (`store_integrations_measurement_id_check`) repeats it, so the two move together.
 */
export const GOOGLE_ANALYTICS_ID_MIN = 6;
export const GOOGLE_ANALYTICS_ID_MAX = 16;

/**
 * `G-` and ASCII capitals or digits, with no flag: an `i` or a `u` added later must not widen what
 * reaches a page. The ID is served to anyone in the shop's public data, on a domain every shop
 * shares. The prefix is the whole of telling a GA4 property from what is not one — Universal
 * Analytics (`UA-`), Tag Manager (`GTM-`, a container of free scripts) and Google Ads (`AW-`).
 */
export const GOOGLE_ANALYTICS_ID = new RegExp(`^G-[A-Z0-9]{${GOOGLE_ANALYTICS_ID_MIN},${GOOGLE_ANALYTICS_ID_MAX}}$`);

/** What a refusal says: the API's answer is where a client with no copy of its own learns why a `UA-` is not taken. */
export const GOOGLE_ANALYTICS_ID_REFUSAL =
  'measurementId must be a Google Analytics 4 measurement ID: "G-" followed by capital letters and digits, as in G-XXXXXXXXXX. A Universal Analytics ID (UA-), a Tag Manager container (GTM-) or a Google Ads ID (AW-) is not one.';

const answering = { context: { errorCode: 'GOOGLE_ANALYTICS_ID_INVALID' satisfies IntegrationErrorCode } };

export class GoogleAnalyticsConnectDto implements GoogleAnalyticsConnectPayload {
  @ApiProperty({ example: 'G-AB12CD34EF', pattern: GOOGLE_ANALYTICS_ID.source, description: "The GA4 measurement ID as Google Analytics shows it under the web data stream. Never a script, never a UA-, GTM- or AW- ID." })
  // An ID copied from Google Analytics often carries the line break or the space around it.
  // Nothing else is mended: a lowercase ID or one with a space inside is refused, not cleaned.
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString(answering)
  @Matches(GOOGLE_ANALYTICS_ID, { ...answering, message: GOOGLE_ANALYTICS_ID_REFUSAL })
  measurementId!: string;
}
