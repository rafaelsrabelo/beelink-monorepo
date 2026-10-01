// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, CashbackOverview, CashbackSettingsPayload, CustomerCashback, StoreCustomer, StoreCustomerDetail } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const DAY = 24 * 60 * 60 * 1000;
const MISSING = '0199a1b2-0000-7000-8000-000000000000';
const RULES: CashbackSettingsPayload = { enabled: true, rateBps: 500, expiresAfterDays: 30, minSubtotalCents: 5000, maxRedeemBps: 5000 };

describe("a shop's cashback: its rules and each customer's credit", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let stranger: AuthSession;
  let maria: StoreCustomer;

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
    stranger = await signUpAndSignIn(app, newEmail('outra'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    await call('POST', '/api/stores', stranger, shopBody('vizinha'));
    maria = await register({ name: 'Maria WhatsApp', phone: '(11) 97777-6666' });
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function register(payload: object, slug = 'lessari', session = owner): Promise<StoreCustomer> {
    const response = await call('POST', `/api/stores/${slug}/customers`, session, payload);
    if (response.statusCode !== 201) throw new Error(`POST customers answered ${response.statusCode}: ${response.payload}`);
    return response.json<StoreCustomer>();
  }

  const save = (rules: object, session = owner) => call('PUT', '/api/stores/lessari/cashback', session, rules);
  const adjust = (customerId: string, amountCents: number, reason = 'Pedido entregue com atraso') =>
    call('POST', `/api/stores/lessari/customers/${customerId}/cashback/adjustments`, owner, { amountCents, reason });
  const cashbackOf = (customerId: string, query = '') => call('GET', `/api/stores/lessari/customers/${customerId}/cashback${query}`, owner).then((response) => response.json<CustomerCashback>());
  const errorOf = (response: { json<T>(): T }) => response.json<ApiErrorBody>().errorCode;

  /** The rule the statement rests on: the balance is what the lots have left, and what the lines add up to. */
  async function expectBooksToHold(customerId: string) {
    const [customer, lots, lines] = await Promise.all([
      prisma.customer.findUniqueOrThrow({ where: { id: customerId } }),
      prisma.cashbackCredit.aggregate({ where: { customerId, status: 'AVAILABLE' }, _sum: { remainingCents: true } }),
      prisma.cashbackEntry.aggregate({ where: { customerId }, _sum: { amountCents: true } }),
    ]);
    expect(customer.cashbackBalanceCents).toBe(lots._sum.remainingCents ?? 0);
    expect(customer.cashbackBalanceCents).toBe(lines._sum.amountCents ?? 0);
  }

  describe('the rules', () => {
    it('reads the defaults, switched off, until the shopkeeper saves any, and owes nothing', async () => {
      const response = await call('GET', '/api/stores/lessari/cashback', owner);

      expect(response.statusCode).toBe(200);
      expect(response.json<CashbackOverview>()).toEqual({
        settings: { enabled: false, rateBps: 500, expiresAfterDays: null, minSubtotalCents: 0, maxRedeemBps: 10000, updatedAt: null },
        owed: { availableCents: 0, pendingCents: 0, expiringSoonCents: 0, expiringSoonDays: 30 },
      });
    });

    it('saves them whole, and reads them back as saved', async () => {
      const saved = await save(RULES);
      expect(saved.statusCode).toBe(200);
      expect(saved.json<CashbackOverview>().settings).toMatchObject({ ...RULES, updatedAt: expect.any(String) });

      // No expiry is a choice, and is sent as null.
      await save({ ...RULES, expiresAfterDays: null, enabled: false });
      expect((await call('GET', '/api/stores/lessari/cashback', owner)).json<CashbackOverview>().settings).toMatchObject({ enabled: false, expiresAfterDays: null });
    });

    it.each([
      ['a rate of nothing', { rateBps: 0 }],
      ['a rate past 100%', { rateBps: 10001 }],
      ['a validity of no days', { expiresAfterDays: 0 }],
      ['a validity past ten years', { expiresAfterDays: 3651 }],
      ['a negative minimum', { minSubtotalCents: -1 }],
      ['credit paying for nothing', { maxRedeemBps: 0 }],
      ['a fractional rate', { rateBps: 2.5 }],
      ['a switch as a word', { enabled: 'sim' }],
    ])('refuses %s', async (_, change) => {
      const response = await save({ ...RULES, ...change });

      expect(response.statusCode).toBe(400);
      expect(errorOf(response)).toBe('CASHBACK_SETTINGS_INVALID');
    });

    it('refuses rules with one left out, rather than reset it', async () => {
      const { expiresAfterDays: _, ...withoutValidity } = RULES;
      const response = await save(withoutValidity);

      expect(response.statusCode).toBe(400);
      expect(errorOf(response)).toBe('CASHBACK_SETTINGS_INVALID');
    });

    it("is the owner's alone", async () => {
      expect((await call('GET', '/api/stores/lessari/cashback', stranger)).statusCode).toBe(403);
      expect((await save(RULES, stranger)).statusCode).toBe(403);
      expect((await call('GET', '/api/stores/lessari/cashback')).statusCode).toBe(401);
      expect((await call('GET', '/api/stores/nenhuma/cashback', owner)).statusCode).toBe(404);
    });
  });

  describe("the shopkeeper's adjustment", () => {
    it('gives credit usable at once, expiring by the rule as it is now, and says so on the statement', async () => {
      await save(RULES);
      const before = Date.now();

      const response = await adjust(maria.id, 1500);

      expect(response.statusCode).toBe(201);
      const cashback = response.json<CustomerCashback>();
      expect(cashback).toMatchObject({ balanceCents: 1500, pendingCents: 0, total: 1, page: 1, pageSize: 20 });
      expect(cashback.entries).toEqual([{ id: expect.any(String), kind: 'ADJUST', amountCents: 1500, orderNumber: null, reason: 'Pedido entregue com atraso', createdAt: expect.any(String) }]);
      expect(cashback.credits).toEqual([
        { id: expect.any(String), status: 'AVAILABLE', amountCents: 1500, remainingCents: 1500, orderNumber: null, availableAt: expect.any(String), expiresAt: expect.any(String) },
      ]);
      const expiresAt = new Date(cashback.credits[0]!.expiresAt!).getTime();
      expect(expiresAt).toBeGreaterThanOrEqual(before + 30 * DAY);
      expect(expiresAt).toBeLessThan(Date.now() + 30 * DAY + 1000);
      expect(cashback.nextExpiry).toEqual({ amountCents: 1500, expiresAt: cashback.credits[0]!.expiresAt });
      await expectBooksToHold(maria.id);
    });

    it('gives credit with the cashback switched off: switching off stops new credit, not corrections', async () => {
      const response = await adjust(maria.id, 700);

      expect(response.statusCode).toBe(201);
      // The defaults: no expiry.
      expect(response.json<CustomerCashback>()).toMatchObject({ balanceCents: 700, nextExpiry: null, credits: [{ expiresAt: null }] });
    });

    it('takes credit from what expires first, and leaves what never expires for last', async () => {
      await save({ ...RULES, expiresAfterDays: 10 });
      await adjust(maria.id, 1000);
      await save({ ...RULES, expiresAfterDays: null });
      await adjust(maria.id, 500);

      const response = await adjust(maria.id, -1200, 'Lançado em dobro');

      expect(response.statusCode).toBe(201);
      const cashback = response.json<CustomerCashback>();
      expect(cashback.balanceCents).toBe(300);
      // The lot expiring in ten days is spent and no longer listed; the one with no expiry kept 300.
      expect(cashback.credits.map((credit) => [credit.amountCents, credit.remainingCents, credit.expiresAt])).toEqual([[500, 300, null]]);
      expect(cashback.nextExpiry).toBeNull();
      expect(cashback.entries.map((entry) => [entry.kind, entry.amountCents, entry.reason])).toEqual([
        ['ADJUST', -1200, 'Lançado em dobro'],
        ['ADJUST', 500, 'Pedido entregue com atraso'],
        ['ADJUST', 1000, 'Pedido entregue com atraso'],
      ]);
      await expectBooksToHold(maria.id);
    });

    /** Decided on 01/10/2026: the balance never goes below zero. */
    it('refuses to take more than the customer has, and writes nothing', async () => {
      await adjust(maria.id, 1000);

      const response = await adjust(maria.id, -1001);

      expect(response.statusCode).toBe(409);
      expect(errorOf(response)).toBe('CASHBACK_BALANCE_INSUFFICIENT');
      expect(await cashbackOf(maria.id)).toMatchObject({ balanceCents: 1000, total: 1 });
      await expectBooksToHold(maria.id);
    });

    it('lets two takings at once spend the balance only once', async () => {
      await adjust(maria.id, 1000);

      const answers = await Promise.all([adjust(maria.id, -700, 'Correção A'), adjust(maria.id, -700, 'Correção B')]);

      expect(answers.map((answer) => answer.statusCode).sort()).toEqual([201, 409]);
      expect((await cashbackOf(maria.id)).balanceCents).toBe(300);
      await expectBooksToHold(maria.id);
    });

    it.each([
      ['nothing', { amountCents: 0, reason: 'Sem motivo bom' }],
      ['a fraction of a cent', { amountCents: 10.5, reason: 'Sem motivo bom' }],
      ['more than an order can be', { amountCents: 100_000_001, reason: 'Sem motivo bom' }],
      ['no reason', { amountCents: 100 }],
      ['a reason of two letters', { amountCents: 100, reason: '  ok  ' }],
      ['a reason past 200 characters', { amountCents: 100, reason: 'x'.repeat(201) }],
    ])('refuses an adjustment of %s', async (_, body) => {
      const response = await call('POST', `/api/stores/lessari/customers/${maria.id}/cashback/adjustments`, owner, body);

      expect(response.statusCode).toBe(400);
      expect(errorOf(response)).toBe('CASHBACK_ADJUSTMENT_INVALID');
    });
  });

  describe("a customer's credit", () => {
    it("is read for this shop's customers only, by its owner only", async () => {
      const elsewhere = await register({ name: 'Cliente da vizinha', phone: '(11) 95555-4444' }, 'vizinha', stranger);

      expect((await call('GET', `/api/stores/lessari/customers/${elsewhere.id}/cashback`, owner)).statusCode).toBe(404);
      expect(errorOf(await call('GET', `/api/stores/lessari/customers/${MISSING}/cashback`, owner))).toBe('CUSTOMER_NOT_FOUND');
      expect(errorOf(await call('GET', '/api/stores/lessari/customers/nao-e-um-id/cashback', owner))).toBe('CUSTOMER_NOT_FOUND');
      expect((await adjust(elsewhere.id, 100)).statusCode).toBe(404);
      expect((await call('GET', `/api/stores/lessari/customers/${maria.id}/cashback`, stranger)).statusCode).toBe(403);
    });

    it('pages the statement, the newest first', async () => {
      for (const amount of [100, 200, 300]) await adjust(maria.id, amount);

      const second = await cashbackOf(maria.id, '?page=2&pageSize=2');

      expect(second).toMatchObject({ balanceCents: 600, total: 3, page: 2, pageSize: 2 });
      expect(second.entries.map((entry) => entry.amountCents)).toEqual([100]);
    });

    it("adds up in what the shop owes, and counts what expires within thirty days", async () => {
      const joana = await register({ name: 'Joana', phone: '(11) 93333-2222' });
      await save({ ...RULES, expiresAfterDays: 10 });
      await adjust(maria.id, 1000);
      await save({ ...RULES, expiresAfterDays: 60 });
      await adjust(joana.id, 400);

      const owed = (await call('GET', '/api/stores/lessari/cashback', owner)).json<CashbackOverview>().owed;

      expect(owed).toEqual({ availableCents: 1400, pendingCents: 0, expiringSoonCents: 1000, expiringSoonDays: 30 });
    });

    it('joins the two statements when the shopkeeper merges two records of one person', async () => {
      const other = await register({ name: 'Maria Outra', phone: '(11) 93333-2222' });
      await adjust(maria.id, 1000);
      await adjust(other.id, 250, 'Brinde de aniversário');

      const merged = await call('POST', `/api/stores/lessari/customers/${maria.id}/merge`, owner, { otherId: other.id });

      expect(merged.statusCode).toBe(200);
      const kept = merged.json<StoreCustomerDetail>().id;
      const cashback = await cashbackOf(kept);
      expect(cashback.balanceCents).toBe(1250);
      expect(cashback.entries.map((entry) => entry.amountCents).sort()).toEqual([1000, 250].sort());
      await expectBooksToHold(kept);
    });
  });
});
