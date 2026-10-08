// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, CustomDomainEntry, CustomDomainOverview, PublicStore } from '@harness-monorepo/contracts';

// App
import { CustomDomainProbe, CustomDomainResolver } from '../src/modules/custom-domain/custom-domain.ports.js';
import { env } from '../src/shared/config/env.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakeDns, FakeDomainProbe } from './support/fake-domain-network.js';
import { resetDatabase } from './support/reset-database.js';

// Hoisted above the imports: `env.ts` reads the environment once, when it is first imported.
vi.hoisted(() => {
  process.env.SHOP_DOMAIN_TARGET_IPS = '';
});

// A developer's own apps/api/.env may name the addresses, and dotenv-expand writes a file's value over a
// variable set to blank: without this they come back, and the suite passes only where no .env does.
vi.mock('dotenv', () => ({ config: () => ({ parsed: {} }) }));

const DOMAIN = 'minhaloja.com.br';
const PATH = '/api/stores/lessari/custom-domain';

/** A deployment that names no address has nothing to tell a shopkeeper to point a domain at, and nothing to check one against. */
describe("a shop's own domain on a deployment with no SHOP_DOMAIN_TARGET_IPS (BEELINK-281)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  const dns = new FakeDns();
  const probe = new FakeDomainProbe();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(CustomDomainResolver).useValue(dns).overrideProvider(CustomDomainProbe).useValue(probe));
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', { name: 'lessari', slug: 'lessari', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } });
  });

  afterAll(async () => {
    await app.close();
  });

  function call(method: 'GET' | 'PUT' | 'POST' | 'DELETE', url: string, payload?: object) {
    return app.inject({ method, url, headers: { authorization: `Bearer ${owner.accessToken}` }, ...(payload ? { payload } : {}) });
  }
  const read = async () => (await call('GET', PATH)).json<CustomDomainOverview>();

  it('says there is no address to point a domain at, and refuses saving one as not available here', async () => {
    expect(env.SHOP_DOMAIN_TARGET_IPS).toBeUndefined();
    expect(await read()).toEqual({ targetIps: null, domain: null, check: null });

    // Whatever is sent: the deployment is what cannot take it.
    for (const domain of [DOMAIN, 'not a domain']) {
      const response = await call('PUT', PATH, { domain });
      expect([response.statusCode, response.json<ApiErrorBody>().errorCode], domain).toEqual([503, 'CUSTOM_DOMAIN_UNAVAILABLE']);
    }

    expect((await read()).domain).toBeNull();
    expect(dns.asked).toEqual([]);
    expect(probe.asked).toEqual([]);
  });

  /** A deployment whose variable was taken away: what its shops had saved is still read, told to the web and removed. */
  it('still reads, tells and removes a domain saved before, and checks none', async () => {
    await prisma.store.update({ where: { slug: 'lessari' }, data: { customDomain: DOMAIN, customDomainStatus: 'ACTIVE' } });

    expect(await read()).toEqual({ targetIps: null, domain: { host: DOMAIN, status: 'ACTIVE', checkedAt: null, problem: null }, check: null });
    expect((await app.inject({ method: 'GET', url: '/api/stores/lessari/public' })).json<PublicStore>().customDomain).toEqual({ host: DOMAIN, status: 'ACTIVE' });
    expect((await app.inject({ method: 'GET', url: '/api/custom-domains' })).json<CustomDomainEntry[]>()).toEqual([{ host: DOMAIN, slug: 'lessari', status: 'ACTIVE' }]);

    const checked = await call('POST', `${PATH}/check`);
    expect([checked.statusCode, checked.json<ApiErrorBody>().errorCode]).toEqual([503, 'CUSTOM_DOMAIN_UNAVAILABLE']);
    expect(dns.asked).toEqual([]);

    expect((await call('DELETE', PATH)).statusCode).toBe(204);
    expect(await read()).toEqual({ targetIps: null, domain: null, check: null });
  });
});
