// Libs
import { describe, expect, it } from 'vitest';

// App
import { newSignInCode, signInCodeHashOf, signInCodeMatches } from './sign-in-code.js';

const SECRET = 'a-secret-long-enough-for-the-api-schema-0123456789';

describe("the checkout's six-digit code", () => {
  it('is six digits, leading zeros kept', () => {
    for (let draw = 0; draw < 200; draw++) expect(newSignInCode()).toMatch(/^\d{6}$/);
  });

  it('is kept as a hash tied to its account: the same digits are another hash for anyone else', () => {
    const kept = signInCodeHashOf(SECRET, 'user-a', '004217');

    expect(kept).toMatch(/^[0-9a-f]{64}$/);
    expect(kept).not.toContain('004217');
    expect(signInCodeHashOf(SECRET, 'user-b', '004217')).not.toBe(kept);
    expect(signInCodeHashOf('another-secret-long-enough-for-the-schema-9876543210', 'user-a', '004217')).not.toBe(kept);
  });

  it('matches the digits it was made from, for its account alone', () => {
    const kept = signInCodeHashOf(SECRET, 'user-a', '004217');

    expect(signInCodeMatches(SECRET, 'user-a', '004217', kept)).toBe(true);
    expect(signInCodeMatches(SECRET, 'user-a', '004218', kept)).toBe(false);
    expect(signInCodeMatches(SECRET, 'user-b', '004217', kept)).toBe(false);
    // A kept value that is not a hash never matches, rather than throwing on its length.
    expect(signInCodeMatches(SECRET, 'user-a', '004217', 'abc')).toBe(false);
  });
});
