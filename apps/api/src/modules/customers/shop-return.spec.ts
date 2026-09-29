// Libs
import { describe, expect, it } from 'vitest';

// App
import { shopReturnOf } from './shop-return.js';

describe('where a shopper goes back to', () => {
  it('is the page inside the shop they were going to', () => {
    expect(shopReturnOf('lessari', '/lessari/carrinho')).toBe('/lessari/carrinho');
    expect(shopReturnOf('lessari', '/lessari/conta/perfil?endereco=novo')).toBe('/lessari/conta/perfil?endereco=novo');
    expect(shopReturnOf('lessari', '/lessari')).toBe('/lessari');
  });

  it("is the shop's front for anything that is not a place inside it", () => {
    for (const raw of [
      undefined,
      null,
      '',
      '/outra/carrinho',
      '/lessari-fake/x',
      'https://evil.example/lessari',
      '//evil.example',
      '/lessari//evil.example',
      '/lessari/\\evil.example',
      '/lessari/../outra',
      '/lessari/./x/..',
      '/lessari/x y',
      `/lessari/${'a'.repeat(300)}`,
    ]) {
      expect(shopReturnOf('lessari', raw), String(raw)).toBe('/lessari');
    }
  });
});
