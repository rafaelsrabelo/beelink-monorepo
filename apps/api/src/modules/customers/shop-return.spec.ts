// Libs
import { describe, expect, it } from 'vitest';

// App
import { shopReturnOf } from './shop-return.js';

describe('where a shopper goes back to', () => {
  it('is the page inside the shop they were going to, written plainly', () => {
    expect(shopReturnOf('lessari', '/lessari/carrinho')).toBe('/lessari/carrinho');
    expect(shopReturnOf('lessari', '/lessari/conta/perfil?endereco=novo')).toBe('/lessari/conta/perfil?endereco=novo');
    expect(shopReturnOf('lessari', '/lessari')).toBe('/lessari');
    expect(shopReturnOf('lessari', '/lessari/x y')).toBe('/lessari/x%20y');
    expect(shopReturnOf('lessari', '/lessari?x=//outro')).toBe('/lessari?x=//outro');
    // A fragment is the page's own business, not a place.
    expect(shopReturnOf('lessari', '/lessari/carrinho#topo')).toBe('/lessari/carrinho');
  });

  it("is the shop's front for anything that is not a place inside it, as a browser would resolve it", () => {
    for (const raw of [
      undefined,
      null,
      '',
      'lessari/carrinho',
      '/outra/carrinho',
      '/lessari-fake/x',
      'https://evil.example/lessari',
      '//evil.example',
      '/lessari//evil.example',
      '/lessari/\\evil.example',
      '/\\evil.example',
      '/lessari/../outra',
      '/lessari/%2e%2e/outra',
      '/lessari/.%2e/outra',
      '/lessari/..#x',
      `/lessari/${'a'.repeat(300)}`,
    ]) {
      expect(shopReturnOf('lessari', raw), String(raw)).toBe('/lessari');
    }
  });
});
