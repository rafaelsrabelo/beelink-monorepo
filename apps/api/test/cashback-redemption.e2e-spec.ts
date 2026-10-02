// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, CustomerCashback, CustomerOrder, CustomerProfile, Order, OrderQuote, Product } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const DAY = 24 * 60 * 60 * 1000;
const RULES = { enabled: true, rateBps: 500, expiresAfterDays: 30, minSubtotalCents: 0, maxRedeemBps: 5000 };

describe('an order spends the customer\'s cashback (BEELINK-240)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let shopper: AuthSession;
  let me: CustomerProfile;
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
    const email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    me = (await call('GET', '/api/stores/lessari/customer/me', shopper)).json<CustomerProfile>();
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const rules = (change: object) => call('PUT', '/api/stores/lessari/cashback', owner, { ...RULES, ...change });
  const give = (amountCents: number) => call('POST', `/api/stores/lessari/customers/${me.id}/cashback/adjustments`, owner, { amountCents, reason: 'Crédito de teste' });
  const cashback = () => call('GET', `/api/stores/lessari/customers/${me.id}/cashback`, owner).then((response) => response.json<CustomerCashback>());
  const quote = (useCashback: boolean, quantity = 1) =>
    call('POST', '/api/stores/lessari/customer/cart/quote', shopper, { items: [{ variantId: whey, quantity }], fulfillment: 'PICKUP', useCashback }).then((response) => response.json<OrderQuote>());
  const place = (cashbackCents: number, quantity = 1) =>
    call('POST', '/api/stores/lessari/customer/orders', shopper, { items: [{ variantId: whey, quantity }], fulfillment: 'PICKUP', paymentMethod: 'PIX', cashbackCents });

  async function expectBooksToHold() {
    const [customer, lots, lines] = await Promise.all([
      prisma.customer.findUniqueOrThrow({ where: { id: me.id } }),
      prisma.cashbackCredit.aggregate({ where: { customerId: me.id, status: 'AVAILABLE' }, _sum: { remainingCents: true } }),
      prisma.cashbackEntry.aggregate({ where: { customerId: me.id }, _sum: { amountCents: true } }),
    ]);
    expect(customer.cashbackBalanceCents).toBe(lots._sum.remainingCents ?? 0);
    expect(customer.cashbackBalanceCents).toBe(lines._sum.amountCents ?? 0);
  }

  describe('quoted', () => {
    it('says what the customer has and the most the cart takes, and applies it only when asked', async () => {
      await give(3_000);

      expect((await quote(false)).cashbackUse).toEqual({ balanceCents: 3_000, maxCents: 3_000, appliedCents: 0, unavailable: null });
      const applied = await quote(true);
      expect(applied.cashbackUse).toMatchObject({ appliedCents: 3_000 });
      expect(applied.totalCents).toBe(7_000);
      // Earned on what is paid in money: 70,00 × 5%.
      expect(applied.cashback).toEqual({ status: 'EARNS', earnedCents: 350, rateBps: 500 });
    });

    it("caps what a cart takes at the shop's share of the products", async () => {
      await give(8_000);

      expect((await quote(true)).cashbackUse).toEqual({ balanceCents: 8_000, maxCents: 5_000, appliedCents: 5_000, unavailable: null });
    });

    it('says why nothing can be used, and says nothing to a visitor', async () => {
      expect((await quote(true)).cashbackUse).toEqual({ balanceCents: 0, maxCents: 0, appliedCents: 0, unavailable: 'NO_BALANCE' });

      const visitor = await call('POST', '/api/stores/lessari/cart/quote', undefined, { items: [{ variantId: whey, quantity: 1 }], fulfillment: 'PICKUP' });
      expect(visitor.json<OrderQuote>().cashbackUse).toBeNull();
    });

    /** Switching the cashback off stops new credit; what the shop owes is still the customer's to spend. */
    it('lets credit already given be spent with the cashback switched off', async () => {
      await give(1_000);
      await rules({ enabled: false });

      expect((await quote(true)).cashbackUse).toMatchObject({ appliedCents: 1_000 });
    });
  });

  describe('placed', () => {
    it('spends exactly what the quote offered, the soonest to expire first, and says so on the statement', async () => {
      await give(1_000);
      await prisma.cashbackCredit.updateMany({ where: { customerId: me.id }, data: { expiresAt: new Date(Date.now() + 5 * DAY) } });
      await give(2_500);

      const placed = await place(3_000);

      expect(placed.statusCode).toBe(201);
      const order = placed.json<CustomerOrder>();
      expect(order).toMatchObject({ cashbackUsedCents: 3_000, discountCents: 0, totalCents: 7_000, cashback: { earnedCents: 350, status: 'PENDING' } });
      const after = await cashback();
      expect(after.balanceCents).toBe(500);
      expect(after.entries[0]).toMatchObject({ kind: 'REDEEM', amountCents: -3_000, orderNumber: order.number });
      const used = await prisma.cashbackRedemption.findMany({ select: { amountCents: true, credit: { select: { amountCents: true } } }, orderBy: { amountCents: 'asc' } });
      // The one expiring in five days went whole; the rest came from the other.
      expect(used.map((use) => [use.credit.amountCents, use.amountCents])).toEqual([
        [1_000, 1_000],
        [2_500, 2_000],
      ]);
      await expectBooksToHold();
    });

    it('refuses an order asking for more than can be spent now, and places nothing', async () => {
      await give(3_000);

      const refused = await place(3_001);

      expect(refused.statusCode).toBe(409);
      expect(refused.json<ApiErrorBody & { details: object }>()).toMatchObject({ errorCode: 'ORDER_CASHBACK_REFUSED', details: { requestedCents: 3_001, maxCents: 3_000 } });
      expect(await prisma.order.count()).toBe(0);
      expect((await cashback()).balanceCents).toBe(3_000);
    });

    it('lets two orders at once spend the balance only once', async () => {
      await give(3_000);

      const answers = await Promise.all([place(3_000), place(3_000)]);

      expect(answers.map((answer) => answer.statusCode).sort()).toEqual([201, 409]);
      expect((await cashback()).balanceCents).toBe(0);
      await expectBooksToHold();
    });

    /** Decided on 01/10/2026: spending credit never takes an order under the minimum. */
    it('earns on what is paid in money, the minimum held against the products before the credit', async () => {
      await rules({ minSubtotalCents: 8_000, maxRedeemBps: 10_000 });
      await give(3_000);

      const order = (await place(3_000)).json<CustomerOrder>();

      expect(order.cashback).toMatchObject({ earnedCents: 350 });
    });

    it('takes credit on a sale the shopkeeper registers, never off the delivery', async () => {
      await rules({ maxRedeemBps: 10_000 });
      await give(20_000);
      await call('PATCH', `/api/stores/lessari/customers/${me.id}`, owner, { address: { zipCode: '01310-930', street: 'Av. Paulista', number: '1000', city: 'São Paulo', state: 'SP' } });
      const sale = { customer: { id: me.id }, items: [{ variantId: whey, quantity: 1 }], fulfillment: 'DELIVERY', deliveryFeeCents: 1_500 };

      const quoted = (await call('POST', '/api/stores/lessari/orders/quote', owner, { ...sale, useCashback: true })).json<OrderQuote>();
      expect(quoted.cashbackUse).toMatchObject({ maxCents: 10_000, appliedCents: 10_000 });
      expect(quoted.totalCents).toBe(1_500);

      const placed = await call('POST', '/api/stores/lessari/orders', owner, { ...sale, paymentMethod: 'PIX', cashbackCents: 10_000 });
      expect(placed.statusCode).toBe(201);
      expect(placed.json<Order>()).toMatchObject({ cashbackUsedCents: 10_000, totalCents: 1_500 });
    });
  });

  describe('cancelled', () => {
    it('gives the credit back to the lots it came from, with their validity, and says so', async () => {
      await give(3_000);
      const before = (await prisma.cashbackCredit.findFirstOrThrow({ where: { customerId: me.id } })).expiresAt;
      const order = (await place(3_000)).json<CustomerOrder>();

      expect((await call('POST', `/api/stores/lessari/customer/orders/${order.number}/cancel`, shopper)).statusCode).toBe(200);

      const after = await cashback();
      expect(after.balanceCents).toBe(3_000);
      expect(after.entries[0]).toMatchObject({ kind: 'REVERSAL', amountCents: 3_000, orderNumber: order.number });
      expect((await prisma.cashbackCredit.findFirstOrThrow({ where: { customerId: me.id } })).expiresAt).toEqual(before);
      await expectBooksToHold();
    });

    /** Decided on 01/10/2026: credit given back has at least seven days to be spent. */
    it('gives credit about to expire seven days from the cancellation', async () => {
      await give(3_000);
      await prisma.cashbackCredit.updateMany({ where: { customerId: me.id }, data: { expiresAt: new Date(Date.now() + 2 * DAY) } });
      const order = (await place(3_000)).json<CustomerOrder>();
      const cancelledAt = Date.now();

      await call('PATCH', `/api/stores/lessari/orders/${order.number}/status`, owner, { status: 'CANCELLED' });

      const lot = await prisma.cashbackCredit.findFirstOrThrow({ where: { customerId: me.id } });
      expect(lot.expiresAt!.getTime()).toBeGreaterThanOrEqual(cancelledAt + 7 * DAY - 1000);
      expect((await cashback()).balanceCents).toBe(3_000);
    });

    it("never recreates credit the shop forgave: spent from an order since cancelled, it pays the shop back instead", async () => {
      await rules({ maxRedeemBps: 10_000 });
      const first = (await place(0, 2)).json<CustomerOrder>();
      await call('PATCH', `/api/stores/lessari/orders/${first.number}/status`, owner, { status: 'DELIVERED' });
      // 200,00 × 5% = 10,00 earned, spent whole on the next order.
      const second = (await place(1_000)).json<CustomerOrder>();
      await call('PATCH', `/api/stores/lessari/orders/${first.number}/status`, owner, { status: 'CANCELLED' });
      expect((await call('GET', `/api/stores/lessari/orders/${first.number}`, owner)).json<Order>().cashback).toMatchObject({ status: 'VOIDED', unrecoveredCents: 1_000 });

      await call('PATCH', `/api/stores/lessari/orders/${second.number}/status`, owner, { status: 'CANCELLED' });

      expect((await call('GET', `/api/stores/lessari/orders/${first.number}`, owner)).json<Order>().cashback).toMatchObject({ status: 'VOIDED', unrecoveredCents: 0 });
      expect((await cashback()).balanceCents).toBe(0);
      await expectBooksToHold();
    });

    /** Found in review: a cent spent and cancelled carried the whole lot a week further, week after week. */
    it('gives the week only to what returns: the rest of the lot keeps its own day', async () => {
      await give(10_000);
      const tomorrow = new Date(Date.now() + DAY);
      await prisma.cashbackCredit.updateMany({ where: { customerId: me.id }, data: { expiresAt: tomorrow } });
      const order = (await place(1)).json<CustomerOrder>();

      expect((await call('POST', `/api/stores/lessari/customer/orders/${order.number}/cancel`, shopper)).statusCode).toBe(200);

      const lots = await prisma.cashbackCredit.findMany({ where: { customerId: me.id, status: 'AVAILABLE' }, orderBy: { createdAt: 'asc' } });
      expect(lots.map((lot) => [lot.remainingCents, lot.expiresAt])).toEqual([
        [9_999, tomorrow],
        [1, expect.any(Date)],
      ]);
      expect(lots[1]!.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 6 * DAY);
      expect((await cashback()).balanceCents).toBe(10_000);
      await expectBooksToHold();
    });

    it('never brings back credit that expired meanwhile', async () => {
      await give(10_000);
      const order = (await place(1)).json<CustomerOrder>();
      await prisma.cashbackCredit.updateMany({ where: { customerId: me.id }, data: { expiresAt: new Date(Date.now() - DAY) } });

      await call('POST', `/api/stores/lessari/customer/orders/${order.number}/cancel`, shopper);

      // The cent it spent is back for a week; what was left of the lot stays expired, for the sweep.
      expect((await quote(false)).cashbackUse).toMatchObject({ balanceCents: 1 });
    });

    it('gives a pending lot back what was spent of it, and its delivery pays all of it out again', async () => {
      const first = (await place(0, 2)).json<CustomerOrder>();
      await call('PATCH', `/api/stores/lessari/orders/${first.number}/status`, owner, { status: 'DELIVERED' });
      // 200,00 × 5% = 10,00 earned; 6,00 of it spent, and then its order goes back.
      const second = (await place(600)).json<CustomerOrder>();
      await call('PATCH', `/api/stores/lessari/orders/${first.number}/status`, owner, { status: 'PREPARING' });

      await call('PATCH', `/api/stores/lessari/orders/${second.number}/status`, owner, { status: 'CANCELLED' });
      await call('PATCH', `/api/stores/lessari/orders/${first.number}/status`, owner, { status: 'DELIVERED' });

      expect((await call('GET', `/api/stores/lessari/orders/${first.number}`, owner)).json<Order>().cashback).toMatchObject({ status: 'AVAILABLE', remainingCents: 1_000, unrecoveredCents: 0 });
      expect((await cashback()).balanceCents).toBe(1_000);
      await expectBooksToHold();
    });

    it('gives the credit back to the record a merge kept', async () => {
      const walkIn = (await call('POST', '/api/stores/lessari/customers', owner, { name: 'Bia Balcão', phone: '(11) 93333-2222' })).json<{ id: string }>();
      await call('POST', `/api/stores/lessari/customers/${walkIn.id}/cashback/adjustments`, owner, { amountCents: 3_000, reason: 'Crédito de teste' });
      const sale = (await call('POST', '/api/stores/lessari/orders', owner, { customer: { id: walkIn.id }, items: [{ variantId: whey, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX', cashbackCents: 3_000 })).json<Order>();
      expect((await call('POST', `/api/stores/lessari/customers/${me.id}/merge`, owner, { otherId: walkIn.id })).statusCode).toBeLessThan(300);

      await call('PATCH', `/api/stores/lessari/orders/${sale.number}/status`, owner, { status: 'CANCELLED' });

      expect((await cashback()).balanceCents).toBe(3_000);
      await expectBooksToHold();
    });
  });

  describe('the panel', () => {
    it("keeps the credit off the total when the delivery's fee is agreed later", async () => {
      await give(20_000);
      await call('PATCH', `/api/stores/lessari/customers/${me.id}`, owner, { address: { zipCode: '01310-930', street: 'Av. Paulista', number: '1000', city: 'São Paulo', state: 'SP' } });
      const sale = { customer: { id: me.id }, items: [{ variantId: whey, quantity: 1 }], fulfillment: 'DELIVERY', deliveryFeeCents: 1_500, paymentMethod: 'PIX', cashbackCents: 5_000 };
      const placed = (await call('POST', '/api/stores/lessari/orders', owner, sale)).json<Order>();
      expect(placed.totalCents).toBe(6_500);

      const agreed = await call('PUT', `/api/stores/lessari/orders/${placed.number}/delivery-fee`, owner, { deliveryFeeCents: 500 });

      expect(agreed.json<Order>()).toMatchObject({ deliveryFeeCents: 500, cashbackUsedCents: 5_000, totalCents: 5_500 });
    });

    it('refuses credit for somebody the sale would register, and registers nobody', async () => {
      const before = await prisma.customer.count();

      const refused = await call('POST', '/api/stores/lessari/orders', owner, { customer: { name: 'Novo', phone: '(11) 94444-5555' }, items: [{ variantId: whey, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX', cashbackCents: 100 });

      expect(refused.statusCode).toBe(409);
      expect(refused.json<ApiErrorBody & { details: object }>()).toMatchObject({ errorCode: 'ORDER_CASHBACK_REFUSED', details: { requestedCents: 100, maxCents: 0 } });
      expect(await prisma.customer.count()).toBe(before);
    });
  });
});
