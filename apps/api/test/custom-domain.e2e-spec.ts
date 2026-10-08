// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, CustomDomainEntry, CustomDomainOverview, PublicStore, Store } from '@harness-monorepo/contracts';

// App
import { CustomDomainProbe, CustomDomainResolver } from '../src/modules/custom-domain/custom-domain.ports.js';
import { CustomDomainSettings } from '../src/modules/custom-domain/custom-domain.settings.js';
import { env } from '../src/shared/config/env.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakeDns, FakeDomainProbe } from './support/fake-domain-network.js';
import { resetDatabase } from './support/reset-database.js';

// The e2e config's SHOP_DOMAIN_TARGET_IPS, and an address that is somebody else's: both from the ranges kept for documentation.
const SERVER = '203.0.113.10';
const PARKING = '198.51.100.7';

const DOMAIN = 'minhaloja.com.br';
const OTHER_DOMAIN = 'outraloja.com';
const PATH = '/api/stores/lessari/custom-domain';
const NEIGHBOUR_PATH = '/api/stores/vizinha/custom-domain';
const TABLE = '/api/custom-domains';

const NO_DOMAIN = { targetIps: [SERVER], domain: null, check: null };
const WWW_OK = { problem: null, addresses: [SERVER] };

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } };
}

type Method = 'GET' | 'PUT' | 'POST' | 'DELETE';

/** Nothing here resolves a name or calls out: `FakeDns` and `FakeDomainProbe` stand where DNS and HTTPS would be. */
describe("a shop's own domain (BEELINK-281)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let stranger: AuthSession;
  const dns = new FakeDns();
  const probe = new FakeDomainProbe();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(CustomDomainResolver).useValue(dns).overrideProvider(CustomDomainProbe).useValue(probe));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    dns.reset();
    probe.reset();
    await resetDatabase(prisma);
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('outra'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    await call('POST', '/api/stores', stranger, shopBody('vizinha'));
  });

  function call(method: Method, url: string, session: AuthSession | null, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }
  const save = (domain: unknown, session: AuthSession = owner, path = PATH) => call('PUT', path, session, { domain });
  const check = () => call('POST', `${PATH}/check`, owner);
  const read = async () => (await call('GET', PATH, owner)).json<CustomDomainOverview>();
  const publicShop = async (slug = 'lessari') => (await call('GET', `/api/stores/${slug}/public`, null)).json<PublicStore>();
  const table = async () => (await call('GET', TABLE, null)).json<CustomDomainEntry[]>();
  const row = () => prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' }, select: { customDomain: true, customDomainStatus: true, customDomainCheckedAt: true, customDomainProblem: true } });

  it('reads the deployment as this suite expects it', () => {
    expect(env.SHOP_DOMAIN_TARGET_IPS).toEqual([SERVER]);
    expect(env.SHOP_DOMAIN_PROBE).toBe(true);
  });

  it('says a shop has no domain: to its owner, with the addresses to point one at; in its public data; in the table', async () => {
    const response = await call('GET', PATH, owner);

    expect(response.statusCode).toBe(200);
    expect(response.json<CustomDomainOverview>()).toEqual(NO_DOMAIN);
    expect((await publicShop()).customDomain).toBeNull();
    expect(await table()).toEqual([]);
    expect(dns.asked).toEqual([]);
  });

  it('saves what the shopkeeper pasted as the bare host, checks it there and then, and it is active when its DNS points here and it answers', async () => {
    dns.point(DOMAIN, SERVER);

    const response = await save('  https://www.MinhaLoja.com.br/produtos?utm=x  ');

    expect(response.statusCode).toBe(200);
    const active = { host: DOMAIN, status: 'ACTIVE', checkedAt: expect.any(String), problem: null };
    expect(response.json<CustomDomainOverview>()).toEqual({ targetIps: [SERVER], domain: active, check: { problem: null, addresses: [SERVER], www: WWW_OK } });
    // Asked by its name, at the address its records had just said.
    expect(probe.asked).toEqual([[DOMAIN, SERVER]]);
    expect(dns.asked.sort()).toEqual([DOMAIN, `www.${DOMAIN}`]);

    // A plain read carries what was kept, and no check.
    expect(await read()).toEqual({ targetIps: [SERVER], domain: active, check: null });
    expect((await publicShop()).customDomain).toEqual({ host: DOMAIN, status: 'ACTIVE' });
    expect((await publicShop('vizinha')).customDomain).toBeNull();
    // The owner's own read of the shop extends the public shape.
    expect((await call('GET', '/api/stores/lessari', owner)).json<Store>().customDomain).toEqual({ host: DOMAIN, status: 'ACTIVE' });
    expect(await table()).toEqual([{ host: DOMAIN, slug: 'lessari', status: 'ACTIVE' }]);
  });

  it('saves, checks again as the DNS and the certificate come right, and removes', async () => {
    // Saved before anything was pointed: kept pending, with what the check found.
    const saved = (await save(DOMAIN)).json<CustomDomainOverview>();
    expect(saved.domain).toEqual({ host: DOMAIN, status: 'PENDING', checkedAt: expect.any(String), problem: 'DNS_NOT_FOUND' });
    expect(saved.check).toEqual({ problem: 'DNS_NOT_FOUND', addresses: [], www: { problem: 'DNS_NOT_FOUND', addresses: [] } });
    expect(probe.asked).toEqual([]);
    // Pending is told too: it is the web that decides what each state opens.
    expect((await publicShop()).customDomain).toEqual({ host: DOMAIN, status: 'PENDING' });
    expect(await table()).toEqual([{ host: DOMAIN, slug: 'lessari', status: 'PENDING' }]);

    // Still at the registrar's parking page: where it points is answered.
    dns.point(DOMAIN, PARKING);
    const elsewhere = await check();
    expect(elsewhere.statusCode).toBe(200);
    expect(elsewhere.json<CustomDomainOverview>()).toMatchObject({ domain: { status: 'PENDING', problem: 'DNS_POINTS_ELSEWHERE' }, check: { problem: 'DNS_POINTS_ELSEWHERE', addresses: [PARKING] } });
    expect(probe.asked).toEqual([]);

    // The DNS failing to answer is its own problem, and not the name missing.
    dns.set(DOMAIN, Object.assign(new Error('queryA ETIMEOUT'), { code: 'ETIMEOUT' }));
    expect((await check()).json<CustomDomainOverview>()).toMatchObject({ domain: { status: 'PENDING', problem: 'DNS_LOOKUP_FAILED' }, check: { problem: 'DNS_LOOKUP_FAILED', addresses: [] } });

    // Pointed here, with the certificate not issued yet; `www.` forgotten is a warning beside it.
    dns.set(DOMAIN, [SERVER]);
    dns.set(`www.${DOMAIN}`, []);
    probe.outcome = 'CERTIFICATE_INVALID';
    expect((await check()).json<CustomDomainOverview>()).toMatchObject({
      domain: { status: 'PENDING', problem: 'HTTPS_CERTIFICATE_INVALID' },
      check: { problem: 'HTTPS_CERTIFICATE_INVALID', addresses: [SERVER], www: { problem: 'DNS_NOT_FOUND', addresses: [] } },
    });
    probe.outcome = 'UNREACHABLE';
    expect((await check()).json<CustomDomainOverview>()).toMatchObject({ domain: { status: 'PENDING', problem: 'HTTPS_UNREACHABLE' } });

    // Answering: active, and `www.` missing does not hold it back.
    probe.outcome = 'ANSWERED';
    const active = (await check()).json<CustomDomainOverview>();
    expect(active).toEqual({ targetIps: [SERVER], domain: { host: DOMAIN, status: 'ACTIVE', checkedAt: expect.any(String), problem: null }, check: { problem: null, addresses: [SERVER], www: { problem: 'DNS_NOT_FOUND', addresses: [] } } });
    expect(await table()).toEqual([{ host: DOMAIN, slug: 'lessari', status: 'ACTIVE' }]);

    expect((await call('DELETE', PATH, owner)).statusCode).toBe(204);
    expect(await read()).toEqual(NO_DOMAIN);
    expect(await row()).toEqual({ customDomain: null, customDomainStatus: null, customDomainCheckedAt: null, customDomainProblem: null });
    expect((await publicShop()).customDomain).toBeNull();
    expect(await table()).toEqual([]);
    // Removing what is not there is not an error: the panel's button may be pressed twice.
    expect((await call('DELETE', PATH, owner)).statusCode).toBe(204);
  });

  /** A shop is not taken down by a DNS server that was slow once: the owner is told, and the domain goes on opening the shop. */
  it('leaves an active domain active when a later check fails, answering and keeping the problem', async () => {
    dns.point(DOMAIN, SERVER);
    await save(DOMAIN);
    const before = (await row()).customDomainCheckedAt;

    dns.reset();
    const failed = (await check()).json<CustomDomainOverview>();

    expect(failed.domain).toEqual({ host: DOMAIN, status: 'ACTIVE', checkedAt: expect.any(String), problem: 'DNS_NOT_FOUND' });
    expect(failed.check?.problem).toBe('DNS_NOT_FOUND');
    expect((await row()).customDomainCheckedAt!.getTime()).toBeGreaterThanOrEqual(before!.getTime());
    expect((await publicShop()).customDomain).toEqual({ host: DOMAIN, status: 'ACTIVE' });
    expect(await table()).toEqual([{ host: DOMAIN, slug: 'lessari', status: 'ACTIVE' }]);

    // Saving the same domain again is a check too, however it was typed: it writes no PENDING over it.
    const again = (await save(`HTTPS://WWW.${DOMAIN.toUpperCase()}/`)).json<CustomDomainOverview>();
    expect(again.domain).toMatchObject({ host: DOMAIN, status: 'ACTIVE', problem: 'DNS_NOT_FOUND' });
    probe.outcome = 'CERTIFICATE_INVALID';
    dns.point(DOMAIN, SERVER);
    expect((await check()).json<CustomDomainOverview>().domain).toMatchObject({ status: 'ACTIVE', problem: 'HTTPS_CERTIFICATE_INVALID' });

    // Found right again: the problem is gone.
    probe.outcome = 'ANSWERED';
    expect((await check()).json<CustomDomainOverview>().domain).toMatchObject({ status: 'ACTIVE', problem: null });
  });

  it('starts over with another domain: pending, nothing kept of the last check, and the old host free for any shop', async () => {
    dns.point(DOMAIN, SERVER);
    await save(DOMAIN);

    const replaced = (await save(OTHER_DOMAIN)).json<CustomDomainOverview>();

    expect(replaced.domain).toEqual({ host: OTHER_DOMAIN, status: 'PENDING', checkedAt: expect.any(String), problem: 'DNS_NOT_FOUND' });
    expect(await table()).toEqual([{ host: OTHER_DOMAIN, slug: 'lessari', status: 'PENDING' }]);

    const taken = await save(DOMAIN, stranger, NEIGHBOUR_PATH);
    expect(taken.statusCode).toBe(200);
    expect(await table()).toEqual([
      { host: DOMAIN, slug: 'vizinha', status: 'ACTIVE' },
      { host: OTHER_DOMAIN, slug: 'lessari', status: 'PENDING' },
    ]);
  });

  it("refuses a domain another shop has, pending or active and however it is typed, and keeps each shop's own", async () => {
    await save(DOMAIN);
    await save(OTHER_DOMAIN, stranger, NEIGHBOUR_PATH);

    for (const typed of [DOMAIN, `https://www.${DOMAIN}/`, DOMAIN.toUpperCase(), `${DOMAIN}.`]) {
      const response = await save(typed, stranger, NEIGHBOUR_PATH);
      expect([response.statusCode, response.json<ApiErrorBody>().errorCode], typed).toEqual([409, 'CUSTOM_DOMAIN_TAKEN']);
    }
    // The refusal took nothing from the shop that asked: it still has the domain it had.
    expect((await publicShop('vizinha')).customDomain).toEqual({ host: OTHER_DOMAIN, status: 'PENDING' });

    dns.point(DOMAIN, SERVER);
    await check();
    expect((await save(DOMAIN, stranger, NEIGHBOUR_PATH)).statusCode).toBe(409);
    expect(await table()).toEqual([
      { host: DOMAIN, slug: 'lessari', status: 'ACTIVE' },
      { host: OTHER_DOMAIN, slug: 'vizinha', status: 'PENDING' },
    ]);

    // Removed, the host is anybody's again.
    await call('DELETE', PATH, owner);
    expect((await save(DOMAIN, stranger, NEIGHBOUR_PATH)).json<CustomDomainOverview>().domain).toMatchObject({ host: DOMAIN, status: 'ACTIVE' });
  });

  it('refuses what is not a domain a shop can have, each with a code of its own, asks the network nothing and keeps what was saved', async () => {
    await save(DOMAIN);
    dns.reset();

    const refused: [payload: object, errorCode: string][] = [
      [{ domain: 'minhaloja' }, 'CUSTOM_DOMAIN_INVALID'],
      [{ domain: '' }, 'CUSTOM_DOMAIN_INVALID'],
      [{ domain: 'minha loja.com.br' }, 'CUSTOM_DOMAIN_INVALID'],
      [{ domain: 'dona@minhaloja.com.br' }, 'CUSTOM_DOMAIN_INVALID'],
      [{ domain: '<script>alert(1)</script>' }, 'CUSTOM_DOMAIN_INVALID'],
      [{}, 'CUSTOM_DOMAIN_INVALID'],
      [{ domain: 12345 }, 'CUSTOM_DOMAIN_INVALID'],
      [{ domain: null }, 'CUSTOM_DOMAIN_INVALID'],
      [{ domain: `${'a'.repeat(2_001)}.com.br` }, 'CUSTOM_DOMAIN_INVALID'],
      [{ domain: '161.97.70.106' }, 'CUSTOM_DOMAIN_IP_ADDRESS'],
      [{ domain: 'http://127.0.0.1:3001/api' }, 'CUSTOM_DOMAIN_IP_ADDRESS'],
      [{ domain: '[::1]' }, 'CUSTOM_DOMAIN_IP_ADDRESS'],
      [{ domain: 'localhost' }, 'CUSTOM_DOMAIN_LOCAL'],
      [{ domain: 'http://localhost:3000/lessari' }, 'CUSTOM_DOMAIN_LOCAL'],
      [{ domain: 'api.internal' }, 'CUSTOM_DOMAIN_LOCAL'],
      [{ domain: 'lojão.com.br' }, 'CUSTOM_DOMAIN_NOT_ASCII'],
    ];
    for (const [payload, errorCode] of refused) {
      const response = await call('PUT', PATH, owner, payload);
      const body = response.json<ApiErrorBody>();
      expect([response.statusCode, body.errorCode], JSON.stringify(payload).slice(0, 80)).toEqual([400, errorCode]);
      expect(body.message.length, errorCode).toBeGreaterThan(20);
    }
    // The message says what to send instead, in the one case a shopkeeper cannot guess.
    expect((await save('lojão.com.br')).json<ApiErrorBody>().message).toContain('xn--');
    // Nothing rides beside the domain.
    expect((await call('PUT', PATH, owner, { domain: OTHER_DOMAIN, status: 'ACTIVE' })).statusCode).toBe(400);

    expect(dns.asked).toEqual([]);
    expect(probe.asked).toEqual([]);
    expect((await read()).domain).toMatchObject({ host: DOMAIN, status: 'PENDING' });
  });

  it('answers that there is nothing to check for a shop with no domain saved', async () => {
    const response = await check();

    expect([response.statusCode, response.json<ApiErrorBody>().errorCode]).toEqual([409, 'CUSTOM_DOMAIN_NOT_SET']);
    expect(dns.asked).toEqual([]);
  });

  it("is the owner's alone, closed to anyone signed out, and says so of a shop that does not exist", async () => {
    dns.point(DOMAIN, SERVER);
    await save(DOMAIN);
    dns.reset();
    probe.reset();

    const routes: [Method, string, object?][] = [['GET', PATH], ['PUT', PATH, { domain: OTHER_DOMAIN }], ['POST', `${PATH}/check`], ['DELETE', PATH]];
    for (const [method, url, payload] of routes) {
      const forbidden = await call(method, url, stranger, payload);
      expect([forbidden.statusCode, forbidden.json<ApiErrorBody>().errorCode], `${method} ${url}`).toEqual([403, 'STORE_FORBIDDEN']);
      expect((await call(method, url, null, payload)).statusCode, `${method} ${url}`).toBe(401);

      const missing = await call(method, url.replace('lessari', 'nenhuma'), owner, payload);
      expect([missing.statusCode, missing.json<ApiErrorBody>().errorCode], `${method} ${url}`).toEqual([404, 'STORE_NOT_FOUND']);
    }

    // Nobody but the owner made the API look anything up, and the domain is as it was.
    expect(dns.asked).toEqual([]);
    expect(probe.asked).toEqual([]);
    expect((await read()).domain).toMatchObject({ host: DOMAIN, status: 'ACTIVE' });
  });

  it('serves the table to the web with no session: every saved domain by host, each with its slug and where it stands, and nothing else', async () => {
    dns.point(OTHER_DOMAIN, SERVER);
    await save(DOMAIN);
    await save(OTHER_DOMAIN, stranger, NEIGHBOUR_PATH);

    const response = await call('GET', TABLE, null);

    expect(response.statusCode).toBe(200);
    expect(response.json<CustomDomainEntry[]>()).toEqual([
      { host: DOMAIN, slug: 'lessari', status: 'PENDING' },
      { host: OTHER_DOMAIN, slug: 'vizinha', status: 'ACTIVE' },
    ]);
    // Reading it asks the network nothing more than the two saves did.
    expect(probe.asked).toEqual([[OTHER_DOMAIN, SERVER]]);
  });

  it('is kept in one form by the database too, whoever writes the row', async () => {
    const write = (slug: string, data: object) => prisma.store.update({ where: { slug }, data });

    // Not the bare host: the unique index would take these for other domains than the one they are.
    for (const customDomain of ['MinhaLoja.com.br', `www.${DOMAIN}`, `https://${DOMAIN}`, `${DOMAIN}.`, `${DOMAIN}/loja`, 'minhaloja', 'minha loja.com.br', '']) {
      await expect(write('lessari', { customDomain, customDomainStatus: 'PENDING' }), JSON.stringify(customDomain)).rejects.toThrow(/stores_custom_domain_check|check constraint/i);
    }
    // A domain and its status go together, and a shop with no domain keeps nothing of a check.
    await expect(write('lessari', { customDomain: DOMAIN })).rejects.toThrow(/stores_custom_domain_status_check|check constraint/i);
    await expect(write('lessari', { customDomainStatus: 'ACTIVE' })).rejects.toThrow(/stores_custom_domain_status_check|check constraint/i);
    await expect(write('lessari', { customDomainProblem: 'DNS_NOT_FOUND' })).rejects.toThrow(/stores_custom_domain_status_check|check constraint/i);
    await expect(write('lessari', { customDomainCheckedAt: new Date() })).rejects.toThrow(/stores_custom_domain_status_check|check constraint/i);

    // One domain, one shop.
    await write('lessari', { customDomain: DOMAIN, customDomainStatus: 'PENDING' });
    await expect(write('vizinha', { customDomain: DOMAIN, customDomainStatus: 'PENDING' })).rejects.toThrow(/unique/i);
    expect(await table()).toEqual([{ host: DOMAIN, slug: 'lessari', status: 'PENDING' }]);
  });
});

/** What the two variables the main suite cannot vary say: the platform's own host, and a deployment with the probe off. */
describe("a shop's own domain on a deployment with its own host and no probe (BEELINK-281)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  const dns = new FakeDns();
  const probe = new FakeDomainProbe();

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(CustomDomainResolver)
        .useValue(dns)
        .overrideProvider(CustomDomainProbe)
        .useValue(probe)
        .overrideProvider(CustomDomainSettings)
        .useValue({ targetIps: [SERVER, '203.0.113.11'], probe: false, platformHost: 'beelink.test' } satisfies CustomDomainSettings),
    );
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await app.inject({ method: 'POST', url: '/api/stores', headers: { authorization: `Bearer ${owner.accessToken}` }, payload: shopBody('lessari') });
  });

  afterAll(async () => {
    await app.close();
  });

  const save = (domain: string) => app.inject({ method: 'PUT', url: PATH, headers: { authorization: `Bearer ${owner.accessToken}` }, payload: { domain } });

  it("refuses the platform's own host and every subdomain of it", async () => {
    for (const domain of ['beelink.test', 'https://www.beelink.test/lessari', 'lessari.beelink.test']) {
      const response = await save(domain);
      expect([response.statusCode, response.json<ApiErrorBody>().errorCode], domain).toEqual([400, 'CUSTOM_DOMAIN_PLATFORM']);
    }
    expect(dns.asked).toEqual([]);
  });

  it('takes the DNS being right for enough, wanting every address of the server, and asks nothing over HTTPS', async () => {
    probe.outcome = 'UNREACHABLE';
    dns.point(DOMAIN, SERVER);
    expect((await save(DOMAIN)).json<CustomDomainOverview>()).toMatchObject({ targetIps: [SERVER, '203.0.113.11'], domain: { status: 'PENDING', problem: 'DNS_POINTS_ELSEWHERE' } });

    dns.point(DOMAIN, '203.0.113.11', SERVER);
    expect((await save(DOMAIN)).json<CustomDomainOverview>()).toMatchObject({ domain: { host: DOMAIN, status: 'ACTIVE', problem: null }, check: { problem: null, addresses: [SERVER, '203.0.113.11'] } });
    expect(probe.asked).toEqual([]);
  });
});
