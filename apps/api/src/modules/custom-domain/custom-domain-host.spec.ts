// App
import { bareHostOf, customDomainHostOf } from './custom-domain-host.js';

const PLATFORM = 'beelink.biz';
const hostOf = (input: string) => customDomainHostOf(input, PLATFORM);

describe('bareHostOf', () => {
  it.each([
    ['minhaloja.com.br', 'minhaloja.com.br'],
    ['https://www.MinhaLoja.com.br/', 'minhaloja.com.br'],
    ['  http://minhaloja.com.br  ', 'minhaloja.com.br'],
    ['\thttps://minhaloja.com.br/produtos/camiseta?cor=azul#fotos\n', 'minhaloja.com.br'],
    ['minhaloja.com.br/produtos', 'minhaloja.com.br'],
    ['minhaloja.com.br?utm_source=x', 'minhaloja.com.br'],
    ['https://minhaloja.com.br:8443/loja', 'minhaloja.com.br'],
    ['minhaloja.com.br:443', 'minhaloja.com.br'],
    ['MINHALOJA.COM.BR.', 'minhaloja.com.br'],
    ['https://www.minhaloja.com.br.:443/', 'minhaloja.com.br'],
    ['//www.minhaloja.com.br', 'minhaloja.com.br'],
    ['www.www.minhaloja.com.br', 'minhaloja.com.br'],
    ['WWW.loja.minhaloja.com.br', 'loja.minhaloja.com.br'],
    // Only a `www.` in front is dropped: one further in, or a name that merely begins with the letters, stays.
    ['loja.www.minhaloja.com.br', 'loja.www.minhaloja.com.br'],
    ['wwwminhaloja.com.br', 'wwwminhaloja.com.br'],
  ])('reads %j as %s', (input, host) => {
    expect(bareHostOf(input)).toBe(host);
  });
});

describe('customDomainHostOf', () => {
  it.each([
    ['https://www.MinhaLoja.com.br/', 'minhaloja.com.br'],
    ['  minhaloja.com.br/carrinho  ', 'minhaloja.com.br'],
    ['loja.minhaloja.com.br', 'loja.minhaloja.com.br'],
    ['minha-loja.com', 'minha-loja.com'],
    ['123loja.com.br', '123loja.com.br'],
    ['a.io', 'a.io'],
    // An internationalised name in the form DNS carries it.
    ['https://xn--lojo-0qa.com.br', 'xn--lojo-0qa.com.br'],
    [`${'a'.repeat(63)}.com`, `${'a'.repeat(63)}.com`],
  ])('takes %j as %s', (input, host) => {
    expect(hostOf(input)).toEqual({ host });
  });

  it.each([
    '',
    '   ',
    'https://',
    'minhaloja',
    'www.minhaloja',
    'com',
    '.com.br',
    'minhaloja..com.br',
    'minhaloja.com.br..',
    'minha loja.com.br',
    'minha_loja.com.br',
    '-minhaloja.com.br',
    'minhaloja-.com.br',
    'minhaloja.com.br-',
    'dona@minhaloja.com.br',
    'https://dona:senha@minhaloja.com.br',
    'mailto:dona@minhaloja.com.br',
    'minhaloja.com.br:porta',
    'minhaloja,com.br',
    '*.minhaloja.com.br',
    '<script>alert(1)</script>',
    `${'a'.repeat(64)}.com`,
    // 254 characters: one past what a DNS name holds.
    `${Array.from({ length: 5 }, () => 'a'.repeat(50)).join('.')}.com`,
  ])('refuses %j as no domain name', (input) => {
    expect(hostOf(input)).toEqual({ refusal: 'INVALID' });
  });

  it.each([
    '161.97.70.106',
    'http://161.97.70.106/',
    '127.0.0.1:3000',
    '10.0.0.1',
    '1.2.3',
    '0x7f.0.0.1',
    'minhaloja.123',
    '2130706433',
    '::1',
    '[::1]',
    'http://[::1]:3000/',
    '2001:db8::1',
    '[2001:db8::1]',
  ])('refuses %j as an IP address', (input) => {
    expect(hostOf(input)).toEqual({ refusal: 'IP_ADDRESS' });
  });

  it.each(['localhost', 'http://localhost:3000', 'LOCALHOST', 'loja.localhost', 'impressora.local', 'api.internal', 'www.localhost'])(
    'refuses %j as a name that only exists inside a network',
    (input) => {
      expect(hostOf(input)).toEqual({ refusal: 'LOCAL' });
    },
  );

  it.each(['lojão.com.br', 'https://www.Lojão.com.br/', 'minhaloja.рф', 'ｍｉｎｈａｌｏｊａ.com.br', 'minhaloja。com。br', 'minhaloja.com.br​'])(
    'refuses %j as a name not in its ASCII form',
    (input) => {
      expect(hostOf(input)).toEqual({ refusal: 'NOT_ASCII' });
    },
  );

  it.each(['beelink.biz', 'https://www.beelink.biz/', 'BEELINK.BIZ.', 'minhaloja.beelink.biz', 'a.b.beelink.biz', 'beelink.biz:443/minhaloja'])(
    "refuses %j as the platform's own address",
    (input) => {
      expect(hostOf(input)).toEqual({ refusal: 'PLATFORM' });
    },
  );

  it("takes a name that only ends like the platform's, or is above it", () => {
    expect(hostOf('meubeelink.biz')).toEqual({ host: 'meubeelink.biz' });
    expect(hostOf('beelink.biz.br')).toEqual({ host: 'beelink.biz.br' });
    expect(customDomainHostOf('beelink.biz', 'app.beelink.biz')).toEqual({ host: 'beelink.biz' });
  });

  it("reads the platform's host as it reads a domain: its www. and its case are not what tells them apart", () => {
    expect(customDomainHostOf('beelink.biz', 'WWW.BeeLink.biz')).toEqual({ refusal: 'PLATFORM' });
    expect(customDomainHostOf('loja.beelink.biz', 'www.beelink.biz')).toEqual({ refusal: 'PLATFORM' });
  });

  it('refuses nothing as the platform when the platform has no host to name', () => {
    expect(customDomainHostOf('minhaloja.com.br', '')).toEqual({ host: 'minhaloja.com.br' });
  });

  it('keeps the form the column checks: what it takes never starts with www. and is lower case', () => {
    const column = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
    for (const input of ['https://WWW.www.MinhaLoja.com.br/', 'Loja.Minha-Loja.COM', 'xn--lojo-0qa.com.br.']) {
      const { host } = hostOf(input);
      expect(host, input).toMatch(column);
      expect(host?.startsWith('www.'), input).toBe(false);
    }
  });
});
