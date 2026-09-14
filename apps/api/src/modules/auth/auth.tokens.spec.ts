// App
import { createOpaqueToken, hashToken } from './auth.tokens.js';

describe('auth tokens', () => {
  it('never hands out the same token twice', () => {
    const tokens = new Set(Array.from({ length: 500 }, () => createOpaqueToken()));

    expect(tokens.size).toBe(500);
  });

  it('stays URL safe, so it survives an e-mail link', () => {
    expect(createOpaqueToken()).toMatch(/^[\w-]+$/);
  });

  it('hashes the same token to the same row key, and a different one elsewhere', () => {
    const token = createOpaqueToken();

    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(hashToken(createOpaqueToken()));
    expect(hashToken(token)).not.toContain(token);
  });
});
