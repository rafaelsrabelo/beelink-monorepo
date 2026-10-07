// Types
import type { BackofficeAuditDetails } from '@harness-monorepo/contracts';

/**
 * A key that reads like one of these is refused, whatever its value: the audit record is read by
 * every administrator and kept for good, so nothing secret is ever written to it — not even hashed.
 */
const SECRET_KEY = /pass(word)?|senha|secret|sealed|token|code|codigo|hash|cookie|authorization|credential|api[-_]?key|cpf/i;

export const AUDIT_DETAIL_MAX_KEYS = 12;
export const AUDIT_DETAIL_MAX_LENGTH = 200;

/**
 * The details of an audit line, checked: flat, small, and with no key that names a secret. Throws —
 * a caller that hands it a body is a bug to find in a test, not a row to store.
 */
export function auditDetailsOf(details: BackofficeAuditDetails = {}): BackofficeAuditDetails {
  const entries = Object.entries(details);
  if (entries.length > AUDIT_DETAIL_MAX_KEYS) {
    throw new Error(`An audit line takes at most ${AUDIT_DETAIL_MAX_KEYS} details`);
  }

  for (const [key, value] of entries) {
    if (SECRET_KEY.test(key)) throw new Error(`An audit line never carries a secret: "${key}" is refused`);

    const flat = value === null || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string';
    if (!flat) throw new Error(`An audit detail is a string, a number, a boolean or null: "${key}" is none`);
    if (typeof value === 'string' && value.length > AUDIT_DETAIL_MAX_LENGTH) {
      throw new Error(`An audit detail is short: "${key}" has more than ${AUDIT_DETAIL_MAX_LENGTH} characters`);
    }
  }

  return Object.fromEntries(entries);
}
