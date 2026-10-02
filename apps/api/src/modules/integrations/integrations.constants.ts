// Types
import type { IntegrationErrorCode } from '@harness-monorepo/contracts';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Long enough to log in at the third party and consent; short enough that an abandoned flow is soon gone. */
export const INTEGRATION_STATE_TTL_MS = 10 * 60 * 1000;

/** An access token this close to its end is renewed before it is used: a label bought on its last day must not fail. */
export const RENEW_BEFORE_MS = 5 * DAY_MS;

/**
 * What the routine renews ahead of time. Wider than `RENEW_BEFORE_MS`, so a shop that sells nothing
 * still renews — Melhor Envio's refresh token lasts 45 days, and one never used runs out.
 */
export const RENEW_AHEAD_MS = 7 * DAY_MS;

/** Melhor Envio's refresh token life, from the trade that gave it; the documentation gives no other point to count from. */
export const MELHOR_ENVIO_REFRESH_LIFE_MS = 45 * DAY_MS;

/** Connections renewed per pass of the routine; the rest wait for the next one. */
export const RENEW_BATCH = 50;

export function integrationError(errorCode: IntegrationErrorCode, message: string, details?: { storeSlug: string }) {
  return { errorCode, message, ...(details ? { details } : {}) };
}
