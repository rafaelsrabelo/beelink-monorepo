// Types
import type { LegalAcceptanceChannel, LegalVersion } from '@harness-monorepo/contracts';

/**
 * The version of bee-link's terms every new account accepts (BEELINK-171). Typed by the contract,
 * which the web's pages are typed by too: the text shown and the version recorded move together.
 */
export const LEGAL_VERSION: LegalVersion = '2026-10-07';

/** An acceptance as it is written, beside the account it belongs to. */
export function legalAcceptanceOf(via: LegalAcceptanceChannel): { version: LegalVersion; via: LegalAcceptanceChannel } {
  return { version: LEGAL_VERSION, via };
}

/** The product's rules, in seconds and counts. They are decisions, not configuration. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 30;

/**
 * Two requests of the same browser — a second tab, a prefetch — can present the same refresh token
 * once the access token expires. Inside this window a spent token rotates again instead of being
 * treated as theft; after it, reuse revokes the whole session.
 */
export const REFRESH_REUSE_GRACE_SECONDS = 20;

export const EMAIL_VERIFICATION_TTL_HOURS = 24;
export const PASSWORD_RESET_TTL_MINUTES = 60;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
