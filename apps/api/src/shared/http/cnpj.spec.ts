// App
import { documentDigitsOf, isCnpj } from './cnpj.js';

describe('a CNPJ', () => {
  it('takes one whose check digits hold, and refuses one that does not, or one digit repeated', () => {
    expect(isCnpj('11222333000181')).toBe(true);
    expect(isCnpj('11444777000161')).toBe(true);
    expect(isCnpj('11222333000182')).toBe(false);
    expect(isCnpj('00000000000000')).toBe(false);
    expect(isCnpj('1122233300018')).toBe(false);
  });

  it('reads the digits through the points, the slash and the dash', () => {
    expect(documentDigitsOf('11.222.333/0001-81')).toBe('11222333000181');
    expect(documentDigitsOf('529.982.247-25')).toBe('52998224725');
    expect(documentDigitsOf('abc')).toBe('abc');
  });
});
