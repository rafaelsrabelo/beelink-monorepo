// Node
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

/** How long a checkout's code holds: long enough to open an e-mail on the same phone, short for a guess. */
export const SIGN_IN_CODE_TTL_MINUTES = 10;
/** Wrong codes a code takes before it stops holding: five tries at a million is one chance in 200 000. */
export const SIGN_IN_CODE_MAX_ATTEMPTS = 5;
/**
 * A code asked again inside this is not sent again: the one on its way still holds. A press of
 * "Continuar" twice, or a script, does not fill a person's inbox.
 */
export const SIGN_IN_CODE_RESEND_MS = 60_000;

/** Six digits from the system's random source, leading zeros kept: "004217" is a code. */
export function newSignInCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * What is kept of a code: an HMAC under the API's secret, of the account's id with the digits. The
 * id ties the code to its account — the same six digits are another hash for anyone else — and the
 * secret keeps a copy of the table from being searched through a million candidates.
 */
export function signInCodeHashOf(secret: string, userId: string, code: string): string {
  return createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex');
}

/** Whether typed digits are the kept code, in a time that does not depend on where they differ. */
export function signInCodeMatches(secret: string, userId: string, typed: string, kept: string): boolean {
  const candidate = Buffer.from(signInCodeHashOf(secret, userId, typed), 'hex');
  const stored = Buffer.from(kept, 'hex');
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}
