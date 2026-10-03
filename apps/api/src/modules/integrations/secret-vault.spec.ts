// Node
import { randomBytes } from 'node:crypto';

// Libs
import { describe, expect, it } from 'vitest';

// App
import { open, seal, vaultKeyOf } from './secret-vault.js';

const key = randomBytes(32);
const shop = { storeId: '01a0f9fd-628b-771d-8076-14b6da4e464d', provider: 'MELHOR_ENVIO' as const };
const tokens = JSON.stringify({ accessToken: 'eyJ.access', refreshToken: 'def.refresh' });

describe('the integrations vault', () => {
  it('seals a value it opens again, and never stores it in the clear', () => {
    const sealed = seal(tokens, key, shop);

    expect(sealed).toMatch(/^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(sealed).not.toContain('access');
    expect(open(sealed, key, shop)).toBe(tokens);
  });

  it('seals the same value differently every time: the nonce is never reused', () => {
    expect(seal(tokens, key, shop)).not.toBe(seal(tokens, key, shop));
  });

  /** A value copied to another shop's row, or read as another party's, is a value that does not open. */
  it('will not open for another shop or another party', () => {
    const sealed = seal(tokens, key, shop);

    expect(() => open(sealed, key, { ...shop, storeId: '01a0faa6-b1dd-72ef-ac81-1afd76bb4d46' })).toThrow();
    expect(() => open(sealed, key, { ...shop, provider: 'ASAAS' })).toThrow();
  });

  it('will not open under another key, or once altered at rest', () => {
    const sealed = seal(tokens, key, shop);
    const [version, iv, tag, body] = sealed.split('.');
    const flipped = Buffer.from(body!, 'base64url');
    flipped[0] = flipped[0]! ^ 1;

    expect(() => open(sealed, randomBytes(32), shop)).toThrow();
    expect(() => open([version, iv, tag, flipped.toString('base64url')].join('.'), key, shop)).toThrow();
    expect(() => open('v2.a.b.c', key, shop)).toThrow('Not a sealed value this vault reads');
  });

  it('takes its key as 32 bytes in base64, and refuses any other length', () => {
    expect(vaultKeyOf(key.toString('base64'))).toEqual(key);
    expect(() => vaultKeyOf(randomBytes(16).toString('base64'))).toThrow();
  });
});
