// Node
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

// App
import { BACKOFFICE_CODE_DIGITS, BACKOFFICE_CODE_MAX_ATTEMPTS } from '../backoffice.constants.js';

/** Uniform over every code there is, leading zeros kept: `randomInt` has no modulo bias. */
export function createSignInCode(): string {
  return randomInt(0, 10 ** BACKOFFICE_CODE_DIGITS).toString().padStart(BACKOFFICE_CODE_DIGITS, '0');
}

/**
 * A code is one in a million, so a plain digest of it is a table anyone can build. This one is keyed
 * by the server and salted with the challenge's token — which the database does not hold either —
 * so a dump of the table says nothing of the codes in it.
 */
export function hashSignInCode(code: string, challengeToken: string, key: string): string {
  return createHmac('sha256', key).update(`${challengeToken}:${code}`).digest('hex');
}

/** Compared in constant time: how long a wrong code takes says nothing of how wrong it was. */
export function signInCodeMatches(code: string, challengeToken: string, key: string, expectedHash: string): boolean {
  const given = Buffer.from(hashSignInCode(code, challengeToken, key), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export interface ChallengeState {
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
}

/** Whether a challenge can still take a code: not spent, not replaced, not expired, not out of attempts. */
export function challengeIsOpen({ expiresAt, attempts, consumedAt }: ChallengeState, now: Date): boolean {
  return consumedAt === null && expiresAt.getTime() > now.getTime() && attempts < BACKOFFICE_CODE_MAX_ATTEMPTS;
}
