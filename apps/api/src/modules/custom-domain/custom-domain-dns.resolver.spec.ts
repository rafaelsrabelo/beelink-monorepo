// App
import { saysNoRecord } from './custom-domain-dns.resolver.js';

const dnsError = (code: string) => Object.assign(new Error(`queryA ${code} minhaloja.com.br`), { code });

/** The adapter itself asks a real DNS server, so no test calls it: what is tested is how its errors are read. */
describe('saysNoRecord', () => {
  it.each(['ENOTFOUND', 'ENODATA'])('reads %s as DNS answering that the name has no record', (code) => {
    expect(saysNoRecord(dnsError(code))).toBe(true);
  });

  it.each(['ETIMEOUT', 'ESERVFAIL', 'EREFUSED', 'ECONNREFUSED', 'EBADRESP', 'ECANCELLED'])('reads %s as DNS not answering, which says nothing of the records', (code) => {
    expect(saysNoRecord(dnsError(code))).toBe(false);
  });

  it('reads what carries no code as DNS not answering', () => {
    for (const error of [new Error('unknown'), null, undefined, 'ENOTFOUND', { code: 404 }]) expect(saysNoRecord(error)).toBe(false);
  });
});
