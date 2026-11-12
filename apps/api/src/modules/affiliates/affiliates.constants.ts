// Types
import type { AffiliateErrorCode, AffiliateProgramPayload, CatalogErrorCode } from '@harness-monorepo/contracts';

/**
 * What a programme reads the first time its owner opens it (IMPULSEIA-101): switched off, so nothing
 * is owed until the shopkeeper says so. A visit counts for 30 days and a period falls due 10 days
 * after it closes — the numbers the shopkeeper asked for (plan 2026-10-24--afiliados, 11/11).
 * The migration's column defaults repeat them.
 */
export const AFFILIATE_PROGRAM_DEFAULTS = {
  enabled: false,
  attributionDays: 30,
  payoutDelayDays: 10,
  termsText: null,
} as const satisfies AffiliateProgramPayload;

/** The default table, as it is born with the programme: a place for the form to start, like cashback's 5%. */
export const DEFAULT_COMMISSION_TABLE = { name: 'Padrão', defaultRateBps: 1000 } as const;

/** 100.00%, in basis points. The migration's CHECKs repeat it. */
export const COMMISSION_BPS_MAX = 10_000;
export const ATTRIBUTION_DAYS_MIN = 1;
export const ATTRIBUTION_DAYS_MAX = 90;
export const PAYOUT_DELAY_DAYS_MAX = 60;
export const TERMS_TEXT_MAX = 10_000;
/** The column is VARCHAR(60), which counts characters as the validator does. */
export const COMMISSION_TABLE_NAME_MAX = 60;
/** A special condition is a table: past fifty, a runaway script rather than conditions anyone follows. */
export const COMMISSION_TABLES_MAX = 50;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function affiliateError(
  errorCode: AffiliateErrorCode | Extract<CatalogErrorCode, 'PRODUCT_NOT_FOUND'>,
  message: string,
): { errorCode: AffiliateErrorCode | Extract<CatalogErrorCode, 'PRODUCT_NOT_FOUND'>; message: string } {
  return { errorCode, message };
}

/** Postgres' unique violation, as Prisma reports it — the backstop for the race a pre-check loses. */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
