// Types
import type { AffiliateErrorCode, AffiliatePayoutMethod, AffiliateProgramPayload, AffiliateStatus, AuthErrorCode, CatalogErrorCode, OrderErrorCode } from '@harness-monorepo/contracts';

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

/** Every code this module answers: its own, and those it shares with the catalogue, the accounts and the orders. */
type AnsweredCode =
  | AffiliateErrorCode
  | Extract<CatalogErrorCode, 'PRODUCT_NOT_FOUND'>
  | Extract<AuthErrorCode, 'AUTH_EMAIL_TAKEN'>
  | Extract<OrderErrorCode, 'ORDER_NOT_FOUND' | 'ORDER_CANCELLED'>;

export function affiliateError<D extends object>(errorCode: AnsweredCode, message: string, details?: D): { errorCode: AnsweredCode; message: string; details?: D } {
  return details ? { errorCode, message, details } : { errorCode, message };
}

/** Postgres' unique violation, as Prisma reports it — the backstop for the race a pre-check loses. */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

export const AFFILIATE_STATUSES = ['INVITED', 'ACTIVE', 'PAUSED', 'ENDED'] as const satisfies readonly AffiliateStatus[];
export const AFFILIATE_NAME_MIN = 2;
export const AFFILIATE_NAME_MAX = 120;
/** The columns' widths, which the validators count in characters as Postgres does. */
export const AFFILIATE_NOTE_MAX = 500;
export const PIX_KEY_MAX = 140;
/** An invite's link works for a week; sending it again starts another one (plan, decision 5). */
export const AFFILIATE_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** The least time between two sends of one invite, so the button never fills someone else's inbox. */
export const AFFILIATE_INVITE_RESEND_FLOOR_MS = 60 * 1000;
export const AFFILIATES_PAGE_SIZE = 20;
export const AFFILIATES_PAGE_SIZE_MAX = 100;
export const AFFILIATES_PAGE_MAX = 10_000;
/** Postgres' foreign-key violation, as Prisma reports it: a row referred to went away in between. */
export function isForeignKeyViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003';
}

/** The shop's words on an adjustment, a payout's note, and why an order moved (IMPULSEIA-107); the columns are VARCHAR(200). */
export const AFFILIATE_REASON_MIN = 3;
export const AFFILIATE_REASON_MAX = 200;
/** R$ 1.000.000,00 either way, the cap an order's own amounts have. */
export const AFFILIATE_AMOUNT_MAX_CENTS = 100_000_000;
/**
 * What one affiliate's balance may reach either way, R$ 10.000.000,00: an adjustment past it is
 * refused, well inside the 32-bit columns the balances and the statement are kept in.
 */
export const AFFILIATE_BALANCE_MAX_CENTS = 1_000_000_000;
export const AFFILIATE_PAYOUT_METHODS = ['PIX', 'TRANSFER', 'CASH'] as const satisfies readonly AffiliatePayoutMethod[];
export const AFFILIATE_STATEMENT_PAGE_SIZE = 20;
export const AFFILIATE_STATEMENT_PAGE_SIZE_MAX = 100;
