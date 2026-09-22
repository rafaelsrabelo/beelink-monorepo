// Types
import type { BannerTarget, ShowcaseLayout } from '@harness-monorepo/contracts';

/**
 * The shapes a banner may take on the landing page. Spelled out rather than derived, like every
 * other enum the wire carries: a reader has to be able to see the whole list.
 */
export const SHOWCASE_LAYOUTS = ['FULL', 'HALVES', 'THIRDS'] as const satisfies readonly ShowcaseLayout[];

/**
 * Where a banner may point. See the BannerTarget enum for why two of the four are foreign keys.
 *
 * `satisfies readonly BannerTarget[]` does not catch a missing value — a subset satisfies it just
 * as well — so this list is the one place where forgetting one is silent. What it would break is
 * `@IsIn`, which would then refuse a target the database accepts.
 */
export const BANNER_TARGETS = [
  'CATEGORY',
  'PRODUCT',
  'EXTERNAL',
  'NONE',
] as const satisfies readonly BannerTarget[];

export const BANNER_TITLE_MAX_LENGTH = 120;
export const BANNER_SUBTITLE_MAX_LENGTH = 200;

/**
 * A bound on the external address, named rather than inherited.
 *
 * `@IsUrl` without one silently takes validator.js's `max_allowed_length` of 2084, which is an
 * accident rather than a decision. Two thousand and forty-eight is what the layout schema already
 * bounds its stored image URLs at, and for the same stated reason: this value is echoed verbatim
 * into an anchor on the anonymous, indexed shop window.
 */
export const BANNER_URL_MAX_LENGTH = 2048;
