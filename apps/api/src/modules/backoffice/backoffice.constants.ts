/**
 * The backoffice's rules, in seconds and counts (BEELINK-227). Decisions, not configuration: this
 * door opens every shop, so its numbers are short on purpose and no deployment loosens them.
 */

/** What an access token of this door says it is. The panel's guard refuses any `kind`; a shop's asks for its own. */
export const BACKOFFICE_TOKEN_KIND = 'backoffice';

export const BACKOFFICE_ACCESS_TOKEN_TTL_SECONDS = 10 * 60;

/** A working day: the session ends here whatever its use, and nothing renews it past this. */
export const BACKOFFICE_SESSION_TTL_HOURS = 8;

/** A session nobody used for this long is over — a screen left open at lunch is not a key. */
export const BACKOFFICE_SESSION_IDLE_MINUTES = 30;

/** `lastSeenAt` moves at most this often, so a busy screen is not one write per request. */
export const BACKOFFICE_SESSION_TOUCH_SECONDS = 60;

/** Two requests of one browser may present the same refresh token; past this, a spent one is a leak. */
export const BACKOFFICE_REFRESH_REUSE_GRACE_SECONDS = 20;

export const BACKOFFICE_CODE_DIGITS = 6;
export const BACKOFFICE_CODE_TTL_MINUTES = 10;

/** Wrong codes a challenge takes before it is dead: 5 guesses in a million. */
export const BACKOFFICE_CODE_MAX_ATTEMPTS = 5;

/** Codes one account may be sent in a window, whatever address asks — an inbox is not to be flooded. */
export const BACKOFFICE_CODE_MAX_PER_WINDOW = 5;
export const BACKOFFICE_CODE_WINDOW_MINUTES = 15;

export const BACKOFFICE_AUDIT_PAGE_SIZE = 50;
export const BACKOFFICE_AUDIT_PAGE_SIZE_MAX = 100;

/** A user agent is whatever the client sent; the record keeps this much of it. */
export const BACKOFFICE_USER_AGENT_MAX_LENGTH = 400;
