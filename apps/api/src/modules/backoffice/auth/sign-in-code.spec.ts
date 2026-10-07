// App
import { BACKOFFICE_CODE_MAX_ATTEMPTS } from '../backoffice.constants.js';
import { challengeIsOpen, createSignInCode, hashSignInCode, signInCodeMatches } from './sign-in-code.js';

const KEY = 'a-server-key-long-enough-for-these-tests';
const NOW = new Date('2026-10-06T12:00:00.000Z');
const open = { expiresAt: new Date('2026-10-06T12:10:00.000Z'), attempts: 0, consumedAt: null };

describe('the backoffice sign-in code', () => {
  it('is six digits, leading zeros kept', () => {
    const codes = Array.from({ length: 500 }, createSignInCode);

    expect(codes.every((code) => /^[0-9]{6}$/.test(code))).toBe(true);
    // 500 draws of a million: the same code every time would be a broken generator, not luck.
    expect(new Set(codes).size).toBeGreaterThan(450);
  });

  it('is stored as a digest that is neither the code nor a plain hash of it', () => {
    const hash = hashSignInCode('042817', 'challenge-token', KEY);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('042817');
    expect(hashSignInCode('042817', 'challenge-token', KEY)).toBe(hash);
  });

  it('hashes differently under another challenge and under another key', () => {
    const hash = hashSignInCode('042817', 'challenge-token', KEY);

    expect(hashSignInCode('042817', 'another-challenge', KEY)).not.toBe(hash);
    expect(hashSignInCode('042817', 'challenge-token', `${KEY}-rotated`)).not.toBe(hash);
  });

  it('matches the code it was made from, and only under its own challenge', () => {
    const hash = hashSignInCode('042817', 'challenge-token', KEY);

    expect(signInCodeMatches('042817', 'challenge-token', KEY, hash)).toBe(true);
    expect(signInCodeMatches('042818', 'challenge-token', KEY, hash)).toBe(false);
    expect(signInCodeMatches('042817', 'another-challenge', KEY, hash)).toBe(false);
    expect(signInCodeMatches('042817', 'challenge-token', KEY, 'not-a-digest')).toBe(false);
  });
});

describe('a sign-in challenge', () => {
  it('takes a code while it is fresh', () => {
    expect(challengeIsOpen(open, NOW)).toBe(true);
  });

  it('is over at the instant it expires', () => {
    expect(challengeIsOpen({ ...open, expiresAt: NOW }, NOW)).toBe(false);
    expect(challengeIsOpen({ ...open, expiresAt: new Date(NOW.getTime() + 1) }, NOW)).toBe(true);
  });

  it('is over once it was used or replaced', () => {
    expect(challengeIsOpen({ ...open, consumedAt: new Date('2026-10-06T11:59:00.000Z') }, NOW)).toBe(false);
  });

  it('is over once its attempts ran out', () => {
    expect(challengeIsOpen({ ...open, attempts: BACKOFFICE_CODE_MAX_ATTEMPTS - 1 }, NOW)).toBe(true);
    expect(challengeIsOpen({ ...open, attempts: BACKOFFICE_CODE_MAX_ATTEMPTS }, NOW)).toBe(false);
  });
});
