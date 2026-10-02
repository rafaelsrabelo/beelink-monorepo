// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerProfile, PublicStore, ShopperCashback } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const RULES = { enabled: true, rateBps: 500, expiresAfterDays: 30, minSubtotalCents: 0, maxRedeemBps: 10000 };

describe("the shopper's own cashback (BEELINK-244)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let shopper: AuthSession;
  let me: CustomerProfile;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    await call('PUT', '/api/stores/lessari/cashback', owner, RULES);
    shopper = await shopperOf('lessari');
    me = (await call('GET', '/api/stores/lessari/customer/me', shopper)).json<CustomerProfile>();
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function shopperOf(slug: string): Promise<AuthSession> {
    const email = newEmail('cliente');
    await call('POST', `/api/stores/${slug}/customer/register`, undefined, { name: 'Bia', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    return (await call('POST', `/api/stores/${slug}/customer/login`, undefined, { email, password: PASSWORD })).json<AuthSession>();
  }

  const give = (amountCents: number, reason: string) => call('POST', `/api/stores/lessari/customers/${me.id}/cashback/adjustments`, owner, { amountCents, reason });
  const mine = (search = '') => call('GET', `/api/stores/lessari/customer/cashback${search}`, shopper);

  it("reads their balance, what is pending, what expires first and the statement — never the shopkeeper's reasons", async () => {
    await give(1_500, 'Bônus de boas-vindas');
    await give(-500, 'Cliente reclamou do atraso');

    const response = await mine();

    expect(response.statusCode).toBe(200);
    const read = response.json<ShopperCashback>();
    expect(read).toMatchObject({ balanceCents: 1_000, pendingCents: 0, total: 2, page: 1 });
    expect(read.nextExpiry).toMatchObject({ amountCents: 1_000 });
    expect(read.credits).toEqual([expect.objectContaining({ status: 'AVAILABLE', amountCents: 1_500, remainingCents: 1_000, orderNumber: null })]);
    expect(read.entries.map((entry) => [entry.kind, entry.amountCents])).toEqual([
      ['ADJUST', -500],
      ['ADJUST', 1_500],
    ]);
    expect(read.entries.map((entry) => Object.keys(entry).sort())).toEqual([
      ['amountCents', 'createdAt', 'id', 'kind', 'orderNumber'],
      ['amountCents', 'createdAt', 'id', 'kind', 'orderNumber'],
    ]);
    expect(response.payload).not.toContain('reclamou');
  });

  it('carries the totals on their profile, for the menu and for deleting the account', async () => {
    await give(1_250, 'Crédito de teste');

    const profile = (await call('GET', '/api/stores/lessari/customer/me', shopper)).json<CustomerProfile>();

    expect(profile.cashback).toEqual({ balanceCents: 1_250, pendingCents: 0 });
  });

  it('pages the statement, the newest first', async () => {
    for (const amount of [100, 200, 300]) await give(amount, 'Crédito de teste');

    const second = (await mine('?page=2&pageSize=2')).json<ShopperCashback>();

    expect(second).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(second.entries.map((entry) => entry.amountCents)).toEqual([100]);
    expect((await mine('?page=0')).statusCode).toBe(400);
  });

  it('starts at nothing for a shopper who never had any', async () => {
    expect((await mine()).json<ShopperCashback>()).toMatchObject({ balanceCents: 0, pendingCents: 0, nextExpiry: null, credits: [], entries: [], total: 0 });
  });

  it("is theirs alone: no token, a shopkeeper's, or another shop's shopper's is refused", async () => {
    await call('POST', '/api/stores', owner, shopBody('outra'));
    const elsewhere = await shopperOf('outra');

    expect((await call('GET', '/api/stores/lessari/customer/cashback')).statusCode).toBe(401);
    expect((await call('GET', '/api/stores/lessari/customer/cashback', owner)).statusCode).toBe(401);
    expect((await call('GET', '/api/stores/lessari/customer/cashback', elsewhere)).statusCode).toBe(401);
  });

  it("names the account's cashback tab in the shop's words", async () => {
    const store = (await call('GET', '/api/stores/lessari/public')).json<PublicStore>();

    expect(store.routeWords.accountTabs.cashback).toBe('cashback');
  });
});
