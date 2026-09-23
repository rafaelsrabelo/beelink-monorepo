// Types
import type { LeadStatus } from '@harness-monorepo/contracts';

/** The closed union, as a value the validators can range over. Checked against the contract. */
export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'WON', 'LOST'] as const satisfies readonly LeadStatus[];

export const LEADS_PAGE_SIZE = 20;
export const LEADS_PAGE_SIZE_MAX = 100;

export const LEAD_NAME_MIN_LENGTH = 2;
export const LEAD_NAME_MAX_LENGTH = 120;

/** An address's own ceiling (RFC 5321), and the column's. */
export const LEAD_EMAIL_MAX_LENGTH = 254;

/** Digits, after stripping punctuation: a Brazilian landline with area code up to a number with a country code. */
export const LEAD_PHONE_DIGITS_MIN = 10;
export const LEAD_PHONE_DIGITS_MAX = 13;

/** A line and a paragraph. The paragraph's bound is the TEXT component's, for the same reason. */
export const LEAD_SHORT_ANSWER_MAX_LENGTH = 200;
export const LEAD_LONG_ANSWER_MAX_LENGTH = 2000;

// The rate limit is deliberately not here: it reads `env`, and this file is imported by the DTOs
// and their unit tests, which must load without a `.env`. It is built in contact.controller.ts.
