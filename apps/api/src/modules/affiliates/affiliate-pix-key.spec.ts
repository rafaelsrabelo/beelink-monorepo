// App
import { pixKeyOf } from './affiliate-pix-key.js';

describe("an affiliate's Pix key", () => {
  it('keeps an e-mail in lower case', () => {
    expect(pixKeyOf('  Maria.Silva@Exemplo.COM ')).toBe('maria.silva@exemplo.com');
  });

  it('keeps a random key in lower case', () => {
    expect(pixKeyOf('123E4567-E89B-12D3-A456-426614174000')).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it("keeps a CPF's and a CNPJ's digits, punctuation or not", () => {
    expect(pixKeyOf('529.982.247-25')).toBe('52998224725');
    expect(pixKeyOf('11.222.333/0001-81')).toBe('11222333000181');
  });

  it('keeps a phone as +55 and its digits, however it was written', () => {
    expect(pixKeyOf('+55 (11) 98888-7777')).toBe('+5511988887777');
    expect(pixKeyOf('(11) 98888-7777')).toBe('+5511988887777');
    expect(pixKeyOf('11 3333-4444')).toBe('+551133334444');
    expect(pixKeyOf('5511988887777')).toBe('+5511988887777');
  });

  it.each([
    ['no key at all', ''],
    ['an e-mail with no domain', 'maria@'],
    ['an e-mail past 77 characters', `${'a'.repeat(70)}@exemplo.com`],
    ['a phone of another country', '+1 202 555 0143'],
    ['a CNPJ whose check digits fail', '11.222.333/0001-80'],
    ['a number of no known length', '123456'],
    ['words', 'minha chave'],
  ])('refuses %s', (_, raw) => {
    expect(pixKeyOf(raw)).toBeNull();
  });
});
