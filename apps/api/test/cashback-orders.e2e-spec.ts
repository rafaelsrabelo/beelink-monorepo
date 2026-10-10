// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerCashback, CustomerConversation, CustomerDataExport, CustomerOrder, CustomerProfile, Order, Product } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const DAY = 24 * 60 * 60 * 1000;
const RULES = { enabled: true, mode: 'STORE', rateBps: 500, expiresAfterDays: 30, minSubtotalCents: 5000, maxRedeemBps: 10000 };
const bia = { name: 'Bia Souza', phone: '(11) 98888-7777' };

describe('an order earns cashback: pending when placed, usable once delivered, taken back when undone', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let whey: string;

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
    const product = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Whey', priceCents: 10_000 })).json<Product>();
    whey = (await prisma.productVariant.findFirstOrThrow({ where: { productId: product.id } })).id;
    await rules(RULES);
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const rules = (change: object) => call('PUT', '/api/stores/lessari/cashback', owner, { ...RULES, ...change });
  const move = (number: number, status: string) => call('PATCH', `/api/stores/lessari/orders/${number}/status`, owner, { status });
  const orderOf = (number: number) => call('GET', `/api/stores/lessari/orders/${number}`, owner).then((response) => response.json<Order>());
  const cashbackOf = (customerId: string) => call('GET', `/api/stores/lessari/customers/${customerId}/cashback`, owner).then((response) => response.json<CustomerCashback>());

  /** The shopkeeper registers a pick-up sale of `quantity` whey, R$ 100,00 each, for Bia. */
  async function sale(payload: object = {}): Promise<Order> {
    const response = await call('POST', '/api/stores/lessari/orders', owner, { customer: bia, items: [{ variantId: whey, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX', ...payload });
    if (response.statusCode !== 201) throw new Error(`POST orders answered ${response.statusCode}: ${response.payload}`);
    return response.json<Order>();
  }

  async function expectBooksToHold(customerId: string) {
    const [customer, lots, pending, lines] = await Promise.all([
      prisma.customer.findUniqueOrThrow({ where: { id: customerId } }),
      prisma.cashbackCredit.aggregate({ where: { customerId, status: 'AVAILABLE' }, _sum: { remainingCents: true } }),
      prisma.cashbackCredit.aggregate({ where: { customerId, status: 'PENDING' }, _sum: { remainingCents: true } }),
      prisma.cashbackEntry.aggregate({ where: { customerId }, _sum: { amountCents: true } }),
    ]);
    expect(customer.cashbackBalanceCents).toBe(lots._sum.remainingCents ?? 0);
    expect(customer.cashbackBalanceCents).toBe(lines._sum.amountCents ?? 0);
    expect(customer.cashbackPendingCents).toBe(pending._sum.remainingCents ?? 0);
  }

  describe('placed', () => {
    it('earns on what was paid for the products, pending until delivered, at the rate of the day', async () => {
      const order = await sale({ items: [{ variantId: whey, quantity: 2 }], discountCents: 1000 });

      expect(order.cashback).toEqual({ earnedCents: 950, rateBps: 500, status: 'PENDING', remainingCents: 950, availableAt: null, expiresAt: null, unrecoveredCents: 0 });
      const cashback = await cashbackOf(order.customer.id);
      expect(cashback).toMatchObject({ balanceCents: 0, pendingCents: 950, total: 0, entries: [] });
      expect(cashback.credits).toEqual([expect.objectContaining({ status: 'PENDING', amountCents: 950, orderNumber: 1 })]);
      await expectBooksToHold(order.customer.id);
    });

    it('earns nothing with the cashback off, or under the minimum, and makes no lot', async () => {
      await rules({ enabled: false });
      expect((await sale()).cashback).toBeNull();

      await rules({ enabled: true });
      // R$ 100,00 less R$ 60,00 by hand is under the R$ 50,00 minimum.
      expect((await sale({ discountCents: 6000 })).cashback).toBeNull();
      expect(await prisma.cashbackCredit.count()).toBe(0);
    });
  });

  /** BEELINK-313: each line at its product's own rate; the order's own discounts shared by what each line costs. */
  describe('placed in a shop that gives by product', () => {
    let creatine: string;
    const product = (id: string, change: object) => call('PUT', `/api/stores/lessari/products/${id}`, owner, change);

    beforeEach(async () => {
      const created = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Creatina', priceCents: 5_000, cashbackRateBps: 1000 })).json<Product>();
      expect(created.cashbackRateBps).toBe(1000);
      creatine = (await prisma.productVariant.findFirstOrThrow({ where: { productId: created.id } })).id;
      await rules({ mode: 'PRODUCT' });
    });

    it('earns on the products that have a rate, and records the average the order was placed at', async () => {
      // R$ 100,00 of whey with no rate and R$ 50,00 of creatine at 10%, less R$ 15,00 by hand: 90% of R$ 5,00.
      const order = await sale({ items: [{ variantId: whey, quantity: 1 }, { variantId: creatine, quantity: 1 }], discountCents: 1500 });

      expect(order.cashback).toMatchObject({ earnedCents: 450, rateBps: 333, status: 'PENDING' });
      await expectBooksToHold(order.customer.id);
    });

    it('earns nothing on an order of products with no rate, whatever the one rate the shop had', async () => {
      expect((await sale()).cashback).toBeNull();
      expect(await prisma.cashbackCredit.count()).toBe(0);
    });

    it.each([
      ['nothing', 0],
      ['past 100%', 10_001],
      ['a fraction of a basis point', 2.5],
    ])("refuses a product's rate of %s", async (_, cashbackRateBps) => {
      const whole = await prisma.product.findFirstOrThrow({ where: { name: 'Whey' } });
      expect((await product(whole.id, { cashbackRateBps })).statusCode).toBe(400);
    });

    it("clears a product's rate with null, and leaves it alone when the key is not sent", async () => {
      const whole = await prisma.product.findFirstOrThrow({ where: { name: 'Creatina' } });
      expect((await product(whole.id, { name: 'Creatina pura' })).json<Product>().cashbackRateBps).toBe(1000);
      expect((await product(whole.id, { cashbackRateBps: null })).json<Product>().cashbackRateBps).toBeNull();
    });
  });

  describe('delivered', () => {
    it('makes it usable from the delivery, expiring by the validity of the day it was placed', async () => {
      const order = await sale();
      // Changed after the order: it applies to the next ones.
      await rules({ rateBps: 1000, expiresAfterDays: 10 });
      const before = Date.now();

      const delivered = (await move(1, 'DELIVERED')).json<Order>();

      expect(delivered.cashback).toMatchObject({ earnedCents: 500, rateBps: 500, status: 'AVAILABLE', remainingCents: 500 });
      const expiresAt = new Date(delivered.cashback!.expiresAt!).getTime();
      expect(expiresAt).toBeGreaterThanOrEqual(before + 30 * DAY);
      expect(expiresAt).toBeLessThan(Date.now() + 30 * DAY + 1000);
      const cashback = await cashbackOf(order.customer.id);
      expect(cashback).toMatchObject({ balanceCents: 500, pendingCents: 0 });
      expect(cashback.entries.map((entry) => [entry.kind, entry.amountCents, entry.orderNumber])).toEqual([['EARN', 500, 1]]);
      await expectBooksToHold(order.customer.id);
    });

    /** The second of two is refused as the same move, under the shop's row lock; the lot is reopened, never made again. */
    it('credits once when two people deliver it at once', async () => {
      const order = await sale();

      const answers = await Promise.all([move(1, 'DELIVERED'), move(1, 'DELIVERED')]);

      expect(answers.map((answer) => answer.statusCode).sort()).toEqual([200, 409]);
      expect(await cashbackOf(order.customer.id)).toMatchObject({ balanceCents: 500, total: 1 });
      await expectBooksToHold(order.customer.id);
    });
  });

  describe('undone', () => {
    it('stops waiting when a pending order is cancelled', async () => {
      const order = await sale();

      const cancelled = (await move(1, 'CANCELLED')).json<Order>();

      expect(cancelled.cashback).toMatchObject({ status: 'VOIDED', remainingCents: 0 });
      expect(await cashbackOf(order.customer.id)).toMatchObject({ balanceCents: 0, pendingCents: 0, credits: [], entries: [] });
      await expectBooksToHold(order.customer.id);
    });

    it('takes back what a delivered order earned when it is cancelled', async () => {
      const order = await sale();
      await move(1, 'DELIVERED');

      await move(1, 'CANCELLED');

      const cashback = await cashbackOf(order.customer.id);
      expect(cashback.balanceCents).toBe(0);
      expect(cashback.entries.map((entry) => [entry.kind, entry.amountCents])).toEqual([
        ['REVERSAL', -500],
        ['EARN', 500],
      ]);
      await expectBooksToHold(order.customer.id);
    });

    it('keeps what the customer had spent when a delivered order is cancelled: what the shop did not get back', async () => {
      const order = await sale();
      await move(1, 'DELIVERED');
      await call('POST', `/api/stores/lessari/customers/${order.customer.id}/cashback/adjustments`, owner, { amountCents: -500, reason: 'Gasto no balcão' });

      const cancelled = (await move(1, 'CANCELLED')).json<Order>();

      expect(cancelled.cashback).toMatchObject({ status: 'VOIDED', remainingCents: 0, unrecoveredCents: 500 });
      // Nothing was left to take back: no line of nothing.
      expect((await cashbackOf(order.customer.id)).entries.map((entry) => entry.kind)).toEqual(['ADJUST', 'EARN']);
      await expectBooksToHold(order.customer.id);
    });

    it('never lists a lot left with nothing to pay out', async () => {
      const order = await sale();
      await move(1, 'DELIVERED');
      await call('POST', `/api/stores/lessari/customers/${order.customer.id}/cashback/adjustments`, owner, { amountCents: -500, reason: 'Gasto no balcão' });

      await move(1, 'PREPARING');

      expect(await cashbackOf(order.customer.id)).toMatchObject({ balanceCents: 0, pendingCents: 0, credits: [] });
    });

    /**
     * Decided on 01/10/2026: the balance stops at zero. What the customer spent before the order left
     * *delivered* is kept as what the shop did not get back, and a delivery again pays out the rest only.
     */
    it('stops at zero once the credit was spent, and pays out only the rest when delivered again', async () => {
      const order = await sale();
      await move(1, 'DELIVERED');
      await call('POST', `/api/stores/lessari/customers/${order.customer.id}/cashback/adjustments`, owner, { amountCents: -200, reason: 'Gasto no balcão' });

      const back = (await move(1, 'OUT_FOR_DELIVERY')).json<Order>();

      expect(back.cashback).toMatchObject({ status: 'PENDING', remainingCents: 300, unrecoveredCents: 200 });
      expect(await cashbackOf(order.customer.id)).toMatchObject({ balanceCents: 0, pendingCents: 300 });
      await expectBooksToHold(order.customer.id);

      const again = (await move(1, 'DELIVERED')).json<Order>();

      expect(again.cashback).toMatchObject({ status: 'AVAILABLE', remainingCents: 300, unrecoveredCents: 200 });
      const cashback = await cashbackOf(order.customer.id);
      expect(cashback.balanceCents).toBe(300);
      expect(cashback.entries.map((entry) => [entry.kind, entry.amountCents])).toEqual([
        ['EARN', 300],
        ['REVERSAL', -300],
        ['ADJUST', -200],
        ['EARN', 500],
      ]);
      await expectBooksToHold(order.customer.id);
    });
  });

  it('earns on the price after a promotion, as the checkout priced it', async () => {
    await call('POST', '/api/stores/lessari/promotions', owner, { name: 'Semana', scope: 'CART', discountKind: 'PERCENT', percentBps: 1000, startsAt: new Date(Date.now() - DAY).toISOString() });

    expect((await sale()).cashback).toMatchObject({ earnedCents: 450, rateBps: 500 });
  });

  describe('told to the customer', () => {
    /** A shopper signed up, confirmed and signed in, with their record at the shop. */
    async function shopper(): Promise<{ session: AuthSession; email: string; me: CustomerProfile }> {
      const email = newEmail('cliente');
      await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia', email, password: PASSWORD });
      await verifyEmailOf(app, email);
      const session = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
      return { session, email, me: (await call('GET', '/api/stores/lessari/customer/me', session)).json<CustomerProfile>() };
    }

    async function placeAs(session: AuthSession): Promise<CustomerOrder> {
      const response = await call('POST', '/api/stores/lessari/customer/orders', session, { items: [{ variantId: whey, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' });
      if (response.statusCode !== 201) throw new Error(`POST customer/orders answered ${response.statusCode}: ${response.payload}`);
      return response.json<CustomerOrder>();
    }

    it('in their order, their conversation and the e-mail of the delivery, never what the shop did not get back', async () => {
      const { session, email } = await shopper();
      const placed = await placeAs(session);
      expect(placed.cashback).toEqual({ earnedCents: 500, rateBps: 500, status: 'PENDING', remainingCents: 500, availableAt: null, expiresAt: null });

      await move(placed.number, 'DELIVERED');

      const mine = (await call('GET', `/api/stores/lessari/customer/orders/${placed.number}`, session)).json<CustomerOrder>();
      expect(mine.cashback).toMatchObject({ status: 'AVAILABLE', remainingCents: 500 });
      expect(mine.cashback).not.toHaveProperty('unrecoveredCents');
      const conversation = (await call('GET', `/api/stores/lessari/customer/orders/${placed.number}/conversation`, session)).json<CustomerConversation>();
      expect(conversation.messages.at(-1)).toMatchObject({ kind: 'STATUS', status: 'DELIVERED', cashbackCents: 500 });
      expect(conversation.messages[0]).toMatchObject({ kind: 'STATUS', status: 'RECEIVED', cashbackCents: null });
      const mail = await waitForMessage(email, 10_000, 'retirado');
      expect(mail.Text).toContain('Você ganhou R$ 5,00 de cashback para usar nas próximas compras na loja, até ');
    });

    it("goes when the customer cancels their own order while it waits", async () => {
      const { session, me } = await shopper();
      const placed = await placeAs(session);

      expect((await call('POST', `/api/stores/lessari/customer/orders/${placed.number}/cancel`, session)).statusCode).toBe(200);

      expect(await cashbackOf(me.id)).toMatchObject({ balanceCents: 0, pendingCents: 0, credits: [], entries: [] });
      expect((await orderOf(placed.number)).cashback).toMatchObject({ status: 'VOIDED' });
    });

    it('pays out nothing for an order delivered after its customer deleted their account', async () => {
      const { session, me } = await shopper();
      const placed = await placeAs(session);
      await call('DELETE', '/api/stores/lessari/customer/me', session, { password: PASSWORD });

      const delivered = (await move(placed.number, 'DELIVERED')).json<Order>();

      expect(delivered.cashback).toMatchObject({ status: 'VOIDED' });
      expect(await cashbackOf(me.id)).toMatchObject({ balanceCents: 0, entries: [] });
    });

    it('in the copy of their data, and lost with the account — told by a line of the statement', async () => {
      const { session, me } = await shopper();
      await placeAs(session);
      await move(1, 'DELIVERED');

      const data = (await call('GET', '/api/stores/lessari/customer/me/data', session)).json<CustomerDataExport>();
      expect(data.cashback).toMatchObject({ balanceCents: 500, pendingCents: 0, entries: [{ kind: 'EARN', amountCents: 500, orderNumber: 1 }] });
      expect(data.cashback.credits).toEqual([expect.objectContaining({ status: 'AVAILABLE', remainingCents: 500 })]);

      expect((await call('DELETE', '/api/stores/lessari/customer/me', session, { password: PASSWORD })).statusCode).toBe(204);

      // The record stays, for the order; the credit does not.
      const cashback = await cashbackOf(me.id);
      expect(cashback).toMatchObject({ balanceCents: 0, pendingCents: 0, credits: [] });
      expect(cashback.entries.map((entry) => [entry.kind, entry.amountCents])).toEqual([
        ['FORFEIT', -500],
        ['EARN', 500],
      ]);
      await expectBooksToHold(me.id);
    });
  });
});
