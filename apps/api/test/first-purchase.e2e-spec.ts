// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  ApiErrorBody,
  AuthSession,
  Coupon,
  CustomerOrder,
  Order,
  OrderCouponRefusedDetails,
  OrderQuote,
  Product,
  Promotion,
  PublicProductDetail,
  StoreCustomer,
  StorefrontCartProducts,
  StorefrontCatalog,
} from '@harness-monorepo/contracts';

// App
import { firstPurchaseOf } from '../src/modules/promotions/order-discounts.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString();

const CAIO = { name: 'Caio Lima', phone: '(11) 97777-6666' };
/** 15% of each unit, up to the cent: 28,49 a whey, twice, and 8,99 of the creatine. */
const OFF = 6597;
const OFF_BY_LINE = [
  [5698, 'Primeira compra'],
  [899, 'Primeira compra'],
];

/**
 * A promotion and a coupon for a first purchase (BEELINK-245): the ticket's two cases — 15% off a
 * first purchase, and a coupon of 10% — made as the panel makes them, with nothing written for them.
 */
describe('a first purchase', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let bia: AuthSession;
  let wheyProduct: Product;
  let whey: string;
  let creatine: string;

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

    wheyProduct = await made<Product>('products', { name: 'Whey', priceCents: 18990 });
    whey = await variantOf(wheyProduct);
    creatine = await variantOf(await made<Product>('products', { name: 'Creatina', priceCents: 5990 }));

    bia = await shopperOf('Bia Cliente', '(11) 98888-7777');
  });

  function call(method: 'GET' | 'POST' | 'PATCH', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function made<T>(path: string, body: object): Promise<T> {
    const response = await call('POST', `/api/stores/lessari/${path}`, owner, body);
    if (response.statusCode !== 201) throw new Error(`POST ${path} answered ${response.statusCode}: ${response.payload}`);
    return response.json<T>();
  }

  async function variantOf(product: Product): Promise<string> {
    return (await prisma.productVariant.findFirstOrThrow({ where: { productId: product.id } })).id;
  }

  /** A signed-in customer of a shop, with a phone. */
  async function shopperOf(name: string, phone: string, shop = 'lessari'): Promise<AuthSession> {
    const email = newEmail('cliente');
    await call('POST', `/api/stores/${shop}/customer/register`, undefined, { name, email, password: PASSWORD });
    await verifyEmailOf(app, email);
    const session = (await call('POST', `/api/stores/${shop}/customer/login`, undefined, { email, password: PASSWORD })).json<AuthSession>();
    await call('PATCH', `/api/stores/${shop}/customer/me`, session, { phone });
    return session;
  }

  const promotion = (body: object) => made<Promotion>('promotions', { name: 'Promoção', scope: 'CART', discountKind: 'PERCENT', percentBps: 1000, startsAt: daysFromNow(-1), ...body });
  const welcome = (body: object = {}) => promotion({ name: 'Primeira compra', percentBps: 1500, audience: 'FIRST_PURCHASE', ...body });
  const welcomeCoupon = (body: object = {}) => made<Coupon>('coupons', { code: 'PRIMEIRA10', kind: 'PERCENT', percentBps: 1000, startsAt: daysFromNow(-1), audience: 'FIRST_PURCHASE', ...body });

  /** Two wheys and a creatine: 43970 before anything is taken off. */
  const CART = () => [{ variantId: whey, quantity: 2 }, { variantId: creatine, quantity: 1 }];
  const pricedAt = async (url: string, session: AuthSession | undefined, body: object = {}) => {
    const response = await call('POST', url, session, { items: CART(), fulfillment: 'PICKUP', ...body });
    if (response.statusCode !== 200) throw new Error(`POST ${url} answered ${response.statusCode}: ${response.payload}`);
    return response.json<OrderQuote>();
  };
  const visitorQuote = () => pricedAt('/api/stores/lessari/cart/quote', undefined);
  /** The signed-in shopper's cart, at the door that takes no coupon. */
  const cartQuote = (session = bia) => pricedAt('/api/stores/lessari/customer/cart/quote', session);
  /** The checkout's, which answers about a code. */
  const checkoutQuote = (body: object = {}, session = bia) => pricedAt('/api/stores/lessari/customer/orders/quote', session, body);
  const shopQuote = (body: object = {}) => pricedAt('/api/stores/lessari/orders/quote', owner, body);

  const place = (body: object = {}, session = bia) => call('POST', '/api/stores/lessari/customer/orders', session, { items: CART(), fulfillment: 'PICKUP', paymentMethod: 'PIX', ...body });
  const register = (body: object = {}) => call('POST', '/api/stores/lessari/orders', owner, { customer: CAIO, items: CART(), fulfillment: 'PICKUP', paymentMethod: 'PIX', ...body });
  const cancel = (number: number) => call('POST', `/api/stores/lessari/customer/orders/${number}/cancel`, bia);
  const usedOf = async (code: string) => (await prisma.coupon.findFirstOrThrow({ where: { code } })).usedCount;
  const refusalOf = (response: { json<T>(): T }) => {
    const body = response.json<ApiErrorBody>();
    return [body.errorCode, (body.details as OrderCouponRefusedDetails | undefined)?.reason];
  };

  describe('the promotion', () => {
    it('is announced to a visitor with what it would take off, and takes nothing off yet', async () => {
      expect(await welcome()).toMatchObject({ name: 'Primeira compra', audience: 'FIRST_PURCHASE', status: 'ACTIVE' });

      const visitor = await visitorQuote();
      expect(visitor.firstPurchase).toEqual({ status: 'UNIDENTIFIED', promotionName: 'Primeira compra', discountCents: OFF });
      expect(visitor).toMatchObject({ subtotalCents: 43970, promotionDiscountCents: 0, discountCents: 0, totalCents: 43970 });
      expect(visitor.lines.map((line) => [line.discountCents, line.promotion])).toEqual([
        [0, null],
        [0, null],
      ]);
    });

    it('is announced for what it adds to the promotions every cart gets, and not at all once it adds nothing', async () => {
      await welcome();
      await promotion({ name: 'Loja toda' });
      // 65,97 on a first purchase against the 43,97 every cart gets.
      expect(await visitorQuote()).toMatchObject({ promotionDiscountCents: 4397, totalCents: 39573, firstPurchase: { status: 'UNIDENTIFIED', promotionName: 'Primeira compra', discountCents: 2200 } });

      // 20% on the whey is past its 15%: it would add only what it takes off the creatine, 8,99 against 5,99.
      await promotion({ name: 'Whey', scope: 'PRODUCTS', percentBps: 2000, productIds: [wheyProduct.id] });
      expect(await visitorQuote()).toMatchObject({ promotionDiscountCents: 8195, firstPurchase: { promotionName: 'Primeira compra', discountCents: 300 } });
      // On a first purchase it competes line by line, as any promotion does.
      const mine = await cartQuote();
      expect(mine.lines.map((line) => [line.discountCents, line.promotion?.name])).toEqual([
        [7596, 'Whey'],
        [899, 'Primeira compra'],
      ]);
      expect(mine).toMatchObject({ promotionDiscountCents: 8495, firstPurchase: null });

      await promotion({ name: 'Trinta', percentBps: 3000 });
      expect((await visitorQuote()).firstPurchase).toBeNull();
      expect((await cartQuote()).lines.map((line) => line.promotion?.name)).toEqual(['Trinta', 'Trinta']);
    });

    it('is on the lines of a shopper with no order — in their cart, at checkout and on the order they place', async () => {
      await welcome();

      const mine = await cartQuote();
      expect(mine).toEqual({
        lines: [
          { variantId: whey, productId: wheyProduct.id, quantity: 2, unitPriceCents: 18990, lineTotalCents: 37980, discountCents: 5698, promotion: { id: expect.any(String), name: 'Primeira compra' } },
          { variantId: creatine, productId: expect.any(String), quantity: 1, unitPriceCents: 5990, lineTotalCents: 5990, discountCents: 899, promotion: { id: expect.any(String), name: 'Primeira compra' } },
        ],
        subtotalCents: 43970,
        promotionDiscountCents: OFF,
        firstPurchase: null,
        coupon: null,
        couponDiscountCents: 0,
        manualDiscountCents: 0,
        discountCents: OFF,
        deliveryFeeCents: 0,
        totalCents: 37373,
      });
      expect(await checkoutQuote()).toEqual(mine);

      const response = await place();
      expect(response.statusCode).toBe(201);
      const order = response.json<CustomerOrder>();
      expect(order).toMatchObject({ subtotalCents: 43970, promotionDiscountCents: OFF, couponDiscountCents: 0, discountCents: OFF, totalCents: 37373 });
      expect(order.items.map((item) => [item.discountCents, item.promotionName])).toEqual(OFF_BY_LINE);
      // The shop reads the same order.
      const shops = (await call('GET', '/api/stores/lessari/orders/1', owner)).json<Order>();
      expect(shops).toMatchObject({ promotionDiscountCents: OFF, discountCents: OFF, totalCents: 37373 });
    });

    it('is not given twice: the next cart says why, with the amount, and the next order pays the catalogue’s price', async () => {
      await welcome();
      expect((await place()).statusCode).toBe(201);

      const next = await cartQuote();
      expect(next.firstPurchase).toEqual({ status: 'NOT_FIRST', promotionName: 'Primeira compra', discountCents: OFF });
      expect(next).toMatchObject({ promotionDiscountCents: 0, discountCents: 0, totalCents: 43970 });
      expect(await checkoutQuote()).toEqual(next);

      const second = (await place()).json<CustomerOrder>();
      expect(second).toMatchObject({ number: 2, promotionDiscountCents: 0, discountCents: 0, totalCents: 43970 });
      expect(second.items.map((item) => [item.discountCents, item.promotionName])).toEqual([
        [0, null],
        [0, null],
      ]);

      // It is still everybody else's who never bought.
      const caio = await shopperOf('Caio Cliente', CAIO.phone);
      expect(await cartQuote(caio)).toMatchObject({ promotionDiscountCents: OFF, firstPurchase: null });
    });

    it('comes back once no order stands: a cancelled one does not count, whoever cancelled it', async () => {
      await welcome();
      expect((await place()).statusCode).toBe(201);
      expect((await cartQuote()).firstPurchase).toMatchObject({ status: 'NOT_FIRST' });

      expect((await cancel(1)).statusCode).toBe(200);
      expect(await cartQuote()).toMatchObject({ promotionDiscountCents: OFF, firstPurchase: null });
      expect((await place()).json<CustomerOrder>()).toMatchObject({ number: 2, promotionDiscountCents: OFF, totalCents: 37373 });

      // Cancelled by the shop this time.
      expect((await call('PATCH', '/api/stores/lessari/orders/2/status', owner, { status: 'CANCELLED' })).statusCode).toBe(200);
      expect((await place()).json<CustomerOrder>()).toMatchObject({ number: 3, promotionDiscountCents: OFF });

      // One that stands is enough, however many were cancelled around it.
      expect((await place()).json<CustomerOrder>()).toMatchObject({ number: 4, promotionDiscountCents: 0 });
      expect((await cancel(4)).statusCode).toBe(200);
      expect((await cartQuote()).firstPurchase).toMatchObject({ status: 'NOT_FIRST' });
    });

    it('counts an order the shop registered for the customer', async () => {
      await welcome();
      // The phone finds Bia's own record: the sale is her first purchase, and takes it.
      const sale = await register({ customer: { name: 'Bia', phone: '(11) 98888-7777' } });
      expect(sale.json<Order>()).toMatchObject({ customer: { name: 'Bia Cliente' }, promotionDiscountCents: OFF });

      expect((await cartQuote()).firstPurchase).toMatchObject({ status: 'NOT_FIRST' });
      expect((await place()).json<CustomerOrder>()).toMatchObject({ promotionDiscountCents: 0, totalCents: 43970 });
    });

    it('goes to one of two orders the same customer places at once', async () => {
      await welcome();

      const both = await Promise.all([place(), place()]);
      expect(both.map((response) => response.statusCode)).toEqual([201, 201]);
      expect(both.map((response) => response.json<CustomerOrder>().promotionDiscountCents).sort((a, b) => a - b)).toEqual([0, OFF]);
    });
  });

  describe('the coupon', () => {
    it('is taken on a first order, after the promotion, and refused with the reason once an order stands', async () => {
      await welcome();
      expect(await welcomeCoupon()).toMatchObject({ code: 'PRIMEIRA10', audience: 'FIRST_PURCHASE' });

      // 43970 − 6597 of the promotion leaves 37373: 10% of it, up to the cent.
      expect(await checkoutQuote({ couponCode: 'primeira10' })).toMatchObject({
        promotionDiscountCents: OFF,
        coupon: { status: 'APPLIED', code: 'PRIMEIRA10', kind: 'PERCENT' },
        couponDiscountCents: 3738,
        discountCents: 10335,
        totalCents: 33635,
      });
      const first = await place({ couponCode: 'primeira10' });
      expect(first.statusCode).toBe(201);
      expect(first.json<CustomerOrder>()).toMatchObject({ promotionDiscountCents: OFF, couponDiscountCents: 3738, coupon: { code: 'PRIMEIRA10', kind: 'PERCENT' }, totalCents: 33635 });

      const next = await checkoutQuote({ couponCode: 'PRIMEIRA10' });
      expect(next.coupon).toEqual({ status: 'REFUSED', code: 'PRIMEIRA10', reason: 'NOT_FIRST_PURCHASE' });
      expect(next).toMatchObject({ promotionDiscountCents: 0, couponDiscountCents: 0, discountCents: 0, totalCents: 43970, firstPurchase: { status: 'NOT_FIRST' } });

      const refused = await place({ couponCode: 'PRIMEIRA10' });
      expect(refused.statusCode).toBe(409);
      expect(refused.json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_COUPON_REFUSED', details: { reason: 'NOT_FIRST_PURCHASE' } });
      // Nothing was written: no second order, no second use.
      expect(await prisma.order.count()).toBe(1);
      expect(await usedOf('PRIMEIRA10')).toBe(1);

      // The order cancelled, the customer is on a first purchase again, and the coupon is theirs.
      expect((await cancel(1)).statusCode).toBe(200);
      expect((await checkoutQuote({ couponCode: 'PRIMEIRA10' })).coupon).toMatchObject({ status: 'APPLIED' });
    });

    it('goes to one of two orders the same customer places with it at once', async () => {
      await welcomeCoupon();

      const both = await Promise.all([place({ couponCode: 'PRIMEIRA10' }), place({ couponCode: 'PRIMEIRA10' })]);
      expect(both.map((response) => response.statusCode).sort()).toEqual([201, 409]);
      expect(refusalOf(both.find((response) => response.statusCode === 409)!)).toEqual(['ORDER_COUPON_REFUSED', 'NOT_FIRST_PURCHASE']);
      expect(await usedOf('PRIMEIRA10')).toBe(1);
    });

    it('is refused on the panel’s sale to a customer who has bought, and held against nobody while none is chosen', async () => {
      await welcomeCoupon();
      expect((await register()).statusCode).toBe(201);

      // Nobody can be said to have bought before the sale has a customer.
      expect((await shopQuote({ couponCode: 'PRIMEIRA10' })).coupon).toMatchObject({ status: 'APPLIED' });
      expect((await shopQuote({ couponCode: 'PRIMEIRA10', customer: CAIO })).coupon).toEqual({ status: 'REFUSED', code: 'PRIMEIRA10', reason: 'NOT_FIRST_PURCHASE' });
      expect(refusalOf(await register({ couponCode: 'PRIMEIRA10' }))).toEqual(['ORDER_COUPON_REFUSED', 'NOT_FIRST_PURCHASE']);

      // Somebody the sale registers has no order yet.
      const dani = { name: 'Dani Reis', phone: '(11) 96666-5555' };
      expect((await shopQuote({ couponCode: 'PRIMEIRA10', customer: dani })).coupon).toMatchObject({ status: 'APPLIED' });
      expect((await register({ couponCode: 'PRIMEIRA10', customer: dani })).json<Order>()).toMatchObject({ couponDiscountCents: 4397, coupon: { code: 'PRIMEIRA10', kind: 'PERCENT' }, totalCents: 39573 });
    });
  });

  describe("the panel's sale", () => {
    it('takes the promotion for a customer it registers with the sale, as its quote said it would', async () => {
      await welcome();

      const quoted = await shopQuote({ customer: CAIO });
      expect(quoted).toMatchObject({ promotionDiscountCents: OFF, firstPurchase: null, discountCents: OFF, totalCents: 37373 });
      // A quote registers nobody.
      expect(await prisma.customer.count({ where: { name: CAIO.name } })).toBe(0);

      const sale = (await register()).json<Order>();
      expect(sale).toMatchObject({ promotionDiscountCents: OFF, discountCents: quoted.discountCents, totalCents: quoted.totalCents });
      expect(sale.items.map((item) => [item.discountCents, item.promotionName])).toEqual(OFF_BY_LINE);

      // Caio has bought now: found by the phone or by the id, the quote says so before the next sale.
      for (const customer of [CAIO, { id: sale.customer.id }]) {
        const again = await shopQuote({ customer });
        expect(again.firstPurchase).toEqual({ status: 'NOT_FIRST', promotionName: 'Primeira compra', discountCents: OFF });
        expect(again).toMatchObject({ promotionDiscountCents: 0, totalCents: 43970 });
      }
      expect((await register()).json<Order>()).toMatchObject({ number: 2, promotionDiscountCents: 0, totalCents: 43970 });
    });

    it('announces it while no customer is chosen, and applies it to one the shop has who never bought', async () => {
      await welcome();

      expect((await shopQuote()).firstPurchase).toEqual({ status: 'UNIDENTIFIED', promotionName: 'Primeira compra', discountCents: OFF });
      // A name alone finds nobody, and is nobody the sale could register.
      expect(await shopQuote({ customer: { name: CAIO.name } })).toMatchObject({ promotionDiscountCents: 0, firstPurchase: { status: 'UNIDENTIFIED' } });

      const known = await made<StoreCustomer>('customers', CAIO);
      expect(await shopQuote({ customer: { id: known.id } })).toMatchObject({ promotionDiscountCents: OFF, firstPurchase: null, totalCents: 37373 });
      expect((await register({ customer: { id: known.id } })).json<Order>()).toMatchObject({ promotionDiscountCents: OFF, totalCents: 37373 });
    });
  });

  describe('the shop window', () => {
    it('keeps the catalogue’s price on the shelf, on the product’s page and in the cart’s read: it is one page for every visitor', async () => {
      await welcome();

      const catalog = (await call('GET', '/api/stores/lessari/catalog')).json<StorefrontCatalog>();
      expect(catalog.products.map((card) => [card.name, card.priceCents, card.compareAtPriceCents, card.promotionName ?? null])).toEqual([
        ['Whey', 18990, null, null],
        ['Creatina', 5990, null, null],
      ]);
      // Nothing is "on sale" by it either.
      expect((await call('GET', '/api/stores/lessari/catalog?desconto=1')).json<StorefrontCatalog>().products).toEqual([]);

      const page = (await call('GET', `/api/stores/lessari/catalog/${wheyProduct.slug}`)).json<PublicProductDetail>();
      expect(page).toMatchObject({ priceCents: 18990, compareAtPriceCents: null });
      expect(page.variants.map((variant) => [variant.priceCents, variant.compareAtPriceCents, variant.promotionName ?? null])).toEqual([[18990, null, null]]);

      const cart = (await call('GET', `/api/stores/lessari/cart?produto=${wheyProduct.id}`)).json<StorefrontCartProducts>();
      expect(cart.products.map((card) => [card.priceCents, card.compareAtPriceCents])).toEqual([[18990, null]]);

      // Beside a promotion for everyone, the shelf shows that one alone.
      await promotion({ name: 'Loja toda' });
      const shelf = (await call('GET', '/api/stores/lessari/catalog')).json<StorefrontCatalog>();
      expect(shelf.products.map((card) => [card.priceCents, card.compareAtPriceCents, card.promotionName])).toEqual([
        [17091, 18990, 'Loja toda'],
        [5391, 5990, 'Loja toda'],
      ]);
    });

    it('schedules no change of price by it: `x-prices-change-at` reads the promotions for everyone alone', async () => {
      const reads = () =>
        Promise.all(
          ['/api/stores/lessari/catalog', `/api/stores/lessari/catalog/${wheyProduct.slug}`, `/api/stores/lessari/cart?produto=${wheyProduct.id}`, '/api/stores/lessari/public'].map(async (url) => {
            const response = await call('GET', url);
            if (response.statusCode !== 200) throw new Error(`GET ${url} answered ${response.statusCode}`);
            return response.headers['x-prices-change-at'] ?? null;
          }),
        );

      // One ending tomorrow and one starting next week, both for a first purchase.
      await welcome({ endsAt: daysFromNow(1) });
      await welcome({ name: 'Semana que vem', startsAt: daysFromNow(3), endsAt: daysFromNow(9) });
      expect(await reads()).toEqual([null, null, null, null]);

      // The later end of a promotion for everyone is the next change, not the nearer ones above.
      const everyone = await promotion({ name: 'Loja toda', endsAt: daysFromNow(5) });
      expect(await reads()).toEqual([everyone.endsAt, everyone.endsAt, everyone.endsAt, everyone.endsAt]);
    });
  });

  describe("the shopper's cart", () => {
    const DOOR = '/api/stores/lessari/customer/cart/quote';

    it('is priced at a door of the signed-in shopper’s alone', async () => {
      const body = { items: CART(), fulfillment: 'PICKUP' };

      for (const session of [undefined, owner]) {
        const refused = await call('POST', DOOR, session, body);
        expect([refused.statusCode, refused.json<ApiErrorBody>().errorCode]).toEqual([401, 'AUTH_UNAUTHENTICATED']);
      }
      // A shopper of another shop is a stranger at this one.
      await call('POST', '/api/stores', owner, shopBody('outra'));
      const theirs = await shopperOf('Dani Cliente', '(11) 96666-5555', 'outra');
      expect((await call('POST', DOOR, theirs, body)).statusCode).toBe(401);
      expect((await call('POST', '/api/stores/nenhuma/customer/cart/quote', bia, body)).statusCode).toBe(404);

      expect((await call('POST', DOOR, bia, body)).statusCode).toBe(200);
    });

    it('takes no coupon, and refuses what an order would', async () => {
      await welcomeCoupon();
      const body = { items: CART(), fulfillment: 'PICKUP' };

      // A code in the body is a field this door does not have: it never says whether one exists.
      for (const couponCode of ['PRIMEIRA10', 'NAOEXISTE', '']) {
        expect((await call('POST', DOOR, bia, { ...body, couponCode })).statusCode, couponCode).toBe(400);
      }
      expect((await call('POST', DOOR, bia, { items: CART() })).statusCode).toBe(400);
      expect((await call('POST', DOOR, bia, { ...body, items: [] })).statusCode).toBe(400);

      const draft = await variantOf(await made<Product>('products', { name: 'Rascunho', priceCents: 1000, status: 'DRAFT' }));
      const off = await call('POST', DOOR, bia, { ...body, items: [{ variantId: draft, quantity: 1 }] });
      expect([off.statusCode, off.json<ApiErrorBody>().errorCode]).toEqual([400, 'ORDER_VARIANT_INVALID']);
    });
  });

  it('is said under the customer’s own lock: of two placements at once, the second reads the order the first wrote', async () => {
    const customer = await prisma.customer.findFirstOrThrow({ where: { name: 'Bia Cliente' } });
    // What a placement does with the answer, without the shop's row lock, which queues placements today.
    const placing = (number: number) =>
      prisma.$transaction(async (tx) => {
        const first = await firstPurchaseOf(tx, customer.id, true);
        // Without the lock, both would have read before either wrote its order.
        await new Promise((resolve) => setTimeout(resolve, 200));
        await tx.order.create({
          data: { storeId: customer.storeId, number, customerId: customer.id, status: 'RECEIVED', fulfillment: 'PICKUP', paymentMethod: 'PIX', subtotalCents: 0, totalCents: 0, placedAt: new Date() },
        });
        return first;
      });

    expect((await Promise.all([placing(1), placing(2)])).sort()).toEqual([false, true]);
  });
});
