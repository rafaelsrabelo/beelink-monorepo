// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  ApiErrorBody,
  AuthSession,
  Coupon,
  CouponRedemptionPage,
  CustomerOrder,
  Order,
  OrderCouponRefusedDetails,
  OrderQuote,
  Product,
  ProductCategory,
  Promotion,
} from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const paulista = { zipCode: '01310-930', street: 'Av. Paulista', number: '1000', complement: 'apto 12', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP' };
const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString();

describe("an order's discounts", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let bia: AuthSession;
  let whey: string;
  let wheyProduct: Product;
  let creatine: string;
  let proteins: ProductCategory;

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
    for (const slug of ['lessari', 'outra']) await call('POST', '/api/stores', owner, shopBody(slug));

    proteins = await made<ProductCategory>('product-categories', { name: 'Proteínas' });
    const wheys = await made<ProductCategory>('product-categories', { name: 'Whey', parentId: proteins.id });
    wheyProduct = await made<Product>('products', { name: 'Whey', priceCents: 18990, categoryId: wheys.id });
    whey = await variantOf(wheyProduct);
    creatine = await variantOf(await made<Product>('products', { name: 'Creatina', priceCents: 5990 }));

    bia = await shopperOf('Bia Cliente', '(11) 98888-7777');
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function made<T>(path: string, body: object, shop = 'lessari'): Promise<T> {
    const response = await call('POST', `/api/stores/${shop}/${path}`, owner, body);
    if (response.statusCode !== 201) throw new Error(`POST ${path} answered ${response.statusCode}: ${response.payload}`);
    return response.json<T>();
  }

  async function variantOf(product: Product): Promise<string> {
    return (await prisma.productVariant.findFirstOrThrow({ where: { productId: product.id } })).id;
  }

  /** A signed-in customer of the shop, with a phone and somewhere to deliver. */
  async function shopperOf(name: string, phone: string): Promise<AuthSession> {
    const email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name, email, password: PASSWORD });
    await verifyEmailOf(app, email);
    const session = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    await call('PATCH', '/api/stores/lessari/customer/me', session, { phone });
    await call('POST', '/api/stores/lessari/customer/addresses', session, paulista);
    return session;
  }

  const promotion = (body: object) => made<Promotion>('promotions', { name: 'Promoção', scope: 'CART', discountKind: 'PERCENT', percentBps: 1000, startsAt: daysFromNow(-1), ...body });
  const coupon = (body: object, shop = 'lessari') => made<Coupon>('coupons', { code: 'BEMVINDO10', kind: 'PERCENT', percentBps: 1000, startsAt: daysFromNow(-1), ...body }, shop);

  /** Two wheys and a creatine: 43970 before anything is taken off. */
  const CART = () => [{ variantId: whey, quantity: 2 }, { variantId: creatine, quantity: 1 }];
  const cartQuote = async (body: object = {}) => (await call('POST', '/api/stores/lessari/cart/quote', undefined, { items: CART(), ...body })).json<OrderQuote>();
  const quote = async (body: object = {}, session = bia) =>
    (await call('POST', '/api/stores/lessari/customer/orders/quote', session, { items: CART(), fulfillment: 'PICKUP', ...body })).json<OrderQuote>();
  const place = (body: object = {}, session = bia) =>
    call('POST', '/api/stores/lessari/customer/orders', session, { items: CART(), fulfillment: 'PICKUP', paymentMethod: 'PIX', ...body });
  const register = (body: object = {}) =>
    call('POST', '/api/stores/lessari/orders', owner, { customer: { name: 'Caio Lima', phone: '(11) 97777-6666' }, items: CART(), fulfillment: 'PICKUP', paymentMethod: 'PIX', ...body });
  const usedOf = async (code: string) => (await prisma.coupon.findFirstOrThrow({ where: { code, store: { slug: 'lessari' } } })).usedCount;
  const refusalOf = (response: { json<T>(): T }) => {
    const body = response.json<ApiErrorBody>();
    return [body.errorCode, (body.details as OrderCouponRefusedDetails | undefined)?.reason];
  };

  describe("the visitor's cart", () => {
    it('prices each line with the one promotion worth the most on it, through a category and the one above it', async () => {
      await promotion({ name: 'Loja toda', percentBps: 500 });
      await promotion({ name: 'Proteínas', scope: 'CATEGORIES', percentBps: 1000, categoryIds: [proteins.id] });
      // Not running: still to start, over, and paused.
      await promotion({ name: 'Agendada', percentBps: 5000, startsAt: daysFromNow(1) });
      await promotion({ name: 'Encerrada', percentBps: 5000, startsAt: daysFromNow(-5), endsAt: daysFromNow(-1) });
      await promotion({ name: 'Pausada', percentBps: 5000, active: false });
      await made<Promotion>('promotions', { name: 'Da outra loja', scope: 'CART', discountKind: 'PERCENT', percentBps: 9000, startsAt: daysFromNow(-1) }, 'outra');

      const priced = await cartQuote();
      expect(priced.lines).toEqual([
        // 10% of 189,90 a unit, twice — the category above the whey's own.
        { variantId: whey, productId: wheyProduct.id, quantity: 2, unitPriceCents: 18990, lineTotalCents: 37980, discountCents: 3798, promotion: { id: expect.any(String), name: 'Proteínas' } },
        // 5% of 59,90 is 2,995: 2,99.
        { variantId: creatine, productId: expect.any(String), quantity: 1, unitPriceCents: 5990, lineTotalCents: 5990, discountCents: 299, promotion: { id: expect.any(String), name: 'Loja toda' } },
      ]);
      expect(priced).toMatchObject({
        subtotalCents: 43970,
        promotionDiscountCents: 4097,
        coupon: null,
        couponDiscountCents: 0,
        manualDiscountCents: 0,
        discountCents: 4097,
        deliveryFeeCents: null,
        totalCents: 39873,
      });
      expect(await cartQuote({ fulfillment: 'PICKUP' })).toMatchObject({ deliveryFeeCents: 0, totalCents: 39873 });
    });

    it('takes a fixed amount off the cart only when it beats the lines’ own promotions together', async () => {
      await promotion({ name: 'Whey', scope: 'PRODUCTS', percentBps: 1000, productIds: [wheyProduct.id] });
      await promotion({ name: 'Trinta', discountKind: 'FIXED', percentBps: null, amountCents: 3000 });
      // 37,98 from the whey's own against 30,00 off the cart.
      expect(await cartQuote()).toMatchObject({ promotionDiscountCents: 3798, lines: [{ promotion: { name: 'Whey' } }, { promotion: null }] });

      await promotion({ name: 'Cinquenta', discountKind: 'FIXED', percentBps: null, amountCents: 5000 });
      const priced = await cartQuote();
      expect(priced).toMatchObject({ promotionDiscountCents: 5000, totalCents: 38970 });
      expect(priced.lines.map((line) => [line.discountCents, line.promotion?.name])).toEqual([
        [4319, 'Cinquenta'],
        [681, 'Cinquenta'],
      ]);
    });

    it('takes no coupon, and refuses what an order would: a line the shop does not sell', async () => {
      await coupon({});
      const withCoupon = await call('POST', '/api/stores/lessari/cart/quote', undefined, { items: CART(), couponCode: 'BEMVINDO10' });
      expect(withCoupon.statusCode).toBe(400);

      const theirs = await variantOf(await made<Product>('products', { name: 'Da outra', priceCents: 1000 }, 'outra'));
      const foreign = await call('POST', '/api/stores/lessari/cart/quote', undefined, { items: [{ variantId: theirs, quantity: 1 }] });
      expect([foreign.statusCode, foreign.json<ApiErrorBody>().errorCode]).toEqual([400, 'ORDER_VARIANT_INVALID']);

      const draft = await variantOf(await made<Product>('products', { name: 'Rascunho', priceCents: 1000, status: 'DRAFT' }));
      const off = await call('POST', '/api/stores/lessari/cart/quote', undefined, { items: [{ variantId: draft, quantity: 1 }] });
      expect([off.statusCode, off.json<ApiErrorBody>().errorCode]).toEqual([400, 'ORDER_VARIANT_INVALID']);
      // The shopkeeper may still price a sale of their own draft.
      const mine = await call('POST', '/api/stores/lessari/orders/quote', owner, { items: [{ variantId: draft, quantity: 1 }], fulfillment: 'PICKUP' });
      expect(mine.json<OrderQuote>()).toMatchObject({ subtotalCents: 1000, totalCents: 1000 });

      expect((await call('POST', '/api/stores/nenhuma/cart/quote', undefined, { items: CART() })).statusCode).toBe(404);
      expect((await call('POST', '/api/stores/lessari/cart/quote', undefined, { items: [] })).statusCode).toBe(400);
    });
  });

  describe("the customer's coupon", () => {
    it('takes the coupon after the promotions, over what is left of the products', async () => {
      await promotion({ name: 'Loja toda', percentBps: 1000 });
      await coupon({ code: 'bemvindo10' });

      // 43970 − 4397 of promotions leaves 39573: 10% of it, rounded down.
      expect(await quote({ couponCode: ' BemVindo10 ' })).toMatchObject({
        subtotalCents: 43970,
        promotionDiscountCents: 4397,
        coupon: { status: 'APPLIED', code: 'BEMVINDO10', kind: 'PERCENT' },
        couponDiscountCents: 3957,
        discountCents: 8354,
        deliveryFeeCents: 0,
        totalCents: 35616,
      });

      await coupon({ code: 'MENOS500', kind: 'FIXED', percentBps: null, amountCents: 50000 });
      // A fixed amount beyond what is left takes all of it, and no more.
      expect(await quote({ couponCode: 'MENOS500' })).toMatchObject({ couponDiscountCents: 39573, totalCents: 0 });
      expect(await quote({ couponCode: '   ' })).toMatchObject({ coupon: null, couponDiscountCents: 0, totalCents: 39573 });
    });

    it('says why a coupon is not taken, and prices the cart without it', async () => {
      await coupon({ code: 'VENCIDO', startsAt: daysFromNow(-10), endsAt: daysFromNow(-1) });
      await coupon({ code: 'ESGOTADO', maxUses: 1 });
      await prisma.coupon.updateMany({ where: { code: 'ESGOTADO' }, data: { usedCount: 1 } });
      await coupon({ code: 'PAUSADO', active: false });
      await coupon({ code: 'AGENDADO', startsAt: daysFromNow(2) });
      await coupon({ code: 'MINIMO', minSubtotalCents: 50000 });
      await coupon({ code: 'FRETE', kind: 'FREE_SHIPPING', percentBps: null });
      await coupon({ code: 'DAOUTRA' }, 'outra');

      const verdictOf = async (couponCode: string, body: object = {}) => {
        const priced = await quote({ couponCode, ...body });
        expect(priced, couponCode).toMatchObject({ couponDiscountCents: 0, discountCents: 0, totalCents: 43970 });
        return priced.coupon;
      };
      expect(await verdictOf('naoexiste')).toEqual({ status: 'REFUSED', code: 'NAOEXISTE', reason: 'NOT_FOUND' });
      expect(await verdictOf('DAOUTRA')).toMatchObject({ reason: 'NOT_FOUND' });
      expect(await verdictOf('cupom com espaço')).toMatchObject({ reason: 'NOT_FOUND' });
      expect(await verdictOf('VENCIDO')).toMatchObject({ reason: 'EXPIRED' });
      expect(await verdictOf('ESGOTADO')).toMatchObject({ reason: 'EXHAUSTED' });
      expect(await verdictOf('PAUSADO')).toMatchObject({ reason: 'INACTIVE' });
      expect(await verdictOf('AGENDADO')).toMatchObject({ reason: 'INACTIVE' });
      expect(await verdictOf('MINIMO')).toEqual({ status: 'REFUSED', code: 'MINIMO', reason: 'BELOW_MINIMUM', minSubtotalCents: 50000 });
      // A pick-up has no delivery to waive.
      expect(await verdictOf('FRETE')).toMatchObject({ reason: 'NOT_APPLICABLE' });

      // On a delivery it is taken; the fee is the shop's to tell, so it takes nothing off yet.
      expect(await quote({ couponCode: 'FRETE', fulfillment: 'DELIVERY' })).toMatchObject({
        coupon: { status: 'APPLIED', kind: 'FREE_SHIPPING' },
        couponDiscountCents: 0,
        deliveryFeeCents: null,
        totalCents: 43970,
      });

      // The minimum is held against what is left after the promotions.
      await coupon({ code: 'QUASE', minSubtotalCents: 40000 });
      expect((await quote({ couponCode: 'QUASE' })).coupon).toMatchObject({ status: 'APPLIED' });
      await promotion({ name: 'Loja toda', percentBps: 1000 });
      expect((await quote({ couponCode: 'QUASE' })).coupon).toEqual({ status: 'REFUSED', code: 'QUASE', reason: 'BELOW_MINIMUM', minSubtotalCents: 40000 });
    });

    it('is the signed-in customer’s alone to ask', async () => {
      expect((await call('POST', '/api/stores/lessari/customer/orders/quote', undefined, { items: CART(), fulfillment: 'PICKUP' })).statusCode).toBe(401);
      expect((await call('POST', '/api/stores/lessari/customer/orders/quote', owner, { items: CART(), fulfillment: 'PICKUP' })).statusCode).toBe(401);
      const stranger = await signUpAndSignIn(app, newEmail('estranho'));
      expect((await call('POST', '/api/stores/lessari/orders/quote', stranger, { items: CART(), fulfillment: 'PICKUP' })).statusCode).toBe(403);
      expect((await call('POST', '/api/stores/lessari/orders/quote', bia, { items: CART(), fulfillment: 'PICKUP' })).statusCode).toBe(401);
    });
  });

  describe('the order', () => {
    it('records what the quote said: each line’s promotion, the coupon, and the use', async () => {
      const proteinas = await promotion({ name: 'Proteínas', scope: 'CATEGORIES', percentBps: 1000, categoryIds: [proteins.id] });
      const welcome = await coupon({ maxUses: 5, maxUsesPerCustomer: 1 });
      const quoted = await quote({ couponCode: 'bemvindo10' });

      const response = await place({ couponCode: 'bemvindo10' });
      expect(response.statusCode).toBe(201);
      const order = response.json<CustomerOrder>();
      // 37980 − 3798 of the promotion, plus the creatine, leaves 40172: the coupon takes 4017.
      expect(order).toMatchObject({
        subtotalCents: 43970,
        promotionDiscountCents: 3798,
        couponDiscountCents: 4017,
        discountCents: 7815,
        coupon: { code: 'BEMVINDO10', kind: 'PERCENT' },
        deliveryFeeCents: 0,
        totalCents: 36155,
      });
      expect(order.items.map((item) => [item.unitPriceCents, item.lineTotalCents, item.discountCents, item.promotionName])).toEqual([
        [18990, 37980, 3798, 'Proteínas'],
        [5990, 5990, 0, null],
      ]);
      expect({ subtotalCents: order.subtotalCents, discountCents: order.discountCents, totalCents: order.totalCents }).toEqual({
        subtotalCents: quoted.subtotalCents,
        discountCents: quoted.discountCents,
        totalCents: quoted.totalCents,
      });

      // The use is on the coupon, and the shop reads the same order.
      expect(await usedOf('BEMVINDO10')).toBe(1);
      const uses = (await call('GET', `/api/stores/lessari/coupons/${welcome.id}/redemptions`, owner)).json<CouponRedemptionPage>();
      expect(uses.redemptions.map((use) => [use.order.number, use.customer.name, use.discountCents])).toEqual([[1, 'Bia Cliente', 4017]]);
      const shops = (await call('GET', '/api/stores/lessari/orders/1', owner)).json<Order>();
      expect(shops).toMatchObject({ promotionDiscountCents: 3798, couponDiscountCents: 4017, discountCents: 7815, coupon: { code: 'BEMVINDO10', kind: 'PERCENT' }, totalCents: 36155 });
      expect(shops.items[0]).toMatchObject({ discountCents: 3798, promotionName: 'Proteínas' });
      const record = await prisma.customer.findFirstOrThrow({ where: { userId: { not: null } } });
      expect(record.totalSpentCents).toBe(36155n);

      // The promotion and the coupon change; the order is what it was.
      await call('PUT', `/api/stores/lessari/promotions/${proteinas.id}`, owner, { name: 'Outro nome', scope: 'CART', discountKind: 'PERCENT', percentBps: 5000, startsAt: daysFromNow(-1) });
      await call('PUT', `/api/stores/lessari/coupons/${welcome.id}`, owner, { code: 'OUTROCODIGO', kind: 'FIXED', amountCents: 100, startsAt: daysFromNow(-1) });
      expect((await call('GET', '/api/stores/lessari/customer/orders/1', bia)).json<CustomerOrder>()).toEqual(order);
    });

    it('refuses an order whose coupon does not hold, saving nothing', async () => {
      await coupon({ code: 'MINIMO', minSubtotalCents: 50000 });
      await prisma.productVariant.update({ where: { id: whey }, data: { trackStock: true, stockQuantity: 5 } });

      const below = await place({ couponCode: 'MINIMO' });
      expect(below.statusCode).toBe(409);
      expect(below.json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_COUPON_REFUSED', details: { reason: 'BELOW_MINIMUM', minSubtotalCents: 50000 } });
      expect(refusalOf(await place({ couponCode: 'naoexiste' }))).toEqual(['ORDER_COUPON_REFUSED', 'NOT_FOUND']);
      expect(refusalOf(await register({ couponCode: 'naoexiste' }))).toEqual(['ORDER_COUPON_REFUSED', 'NOT_FOUND']);

      // No order, no number taken, no stock taken, no customer registered with it.
      expect(await prisma.order.count()).toBe(0);
      expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: whey } })).stockQuantity).toBe(5);
      expect(await prisma.customer.count({ where: { name: 'Caio Lima' } })).toBe(0);
      expect((await place()).json<CustomerOrder>().number).toBe(1);
    });

    it('never passes a coupon’s limit when two orders arrive at once', async () => {
      const caio = await shopperOf('Caio Cliente', '(11) 97777-6666');
      await coupon({ code: 'UMSO', maxUses: 1 });

      const both = await Promise.all([place({ couponCode: 'UMSO' }, bia), place({ couponCode: 'UMSO' }, caio)]);
      expect(both.map((response) => response.statusCode).sort()).toEqual([201, 409]);
      expect(refusalOf(both.find((response) => response.statusCode === 409)!)).toEqual(['ORDER_COUPON_REFUSED', 'EXHAUSTED']);
      expect(await usedOf('UMSO')).toBe(1);
      expect(await prisma.couponRedemption.count()).toBe(1);

      // One a customer: the same customer twice at once takes it once.
      await coupon({ code: 'UMPORCLIENTE', maxUsesPerCustomer: 1 });
      const twice = await Promise.all([place({ couponCode: 'UMPORCLIENTE' }, bia), place({ couponCode: 'UMPORCLIENTE' }, bia)]);
      expect(twice.map((response) => response.statusCode).sort()).toEqual([201, 409]);
      expect(refusalOf(twice.find((response) => response.statusCode === 409)!)).toEqual(['ORDER_COUPON_REFUSED', 'CUSTOMER_LIMIT']);
      expect((await place({ couponCode: 'UMPORCLIENTE' }, caio)).statusCode).toBe(201);
      expect(await usedOf('UMPORCLIENTE')).toBe(2);
      expect((await quote({ couponCode: 'UMPORCLIENTE' })).coupon).toMatchObject({ status: 'REFUSED', reason: 'CUSTOMER_LIMIT' });
    });

    it('gives the coupon’s use back when the order is cancelled, by the customer or by the shop', async () => {
      const once = await coupon({ code: 'UMAVEZ', maxUses: 1, maxUsesPerCustomer: 1 });

      expect((await place({ couponCode: 'UMAVEZ' })).statusCode).toBe(201);
      expect(refusalOf(await place({ couponCode: 'UMAVEZ' }))).toEqual(['ORDER_COUPON_REFUSED', 'EXHAUSTED']);

      expect((await call('POST', '/api/stores/lessari/customer/orders/1/cancel', bia)).statusCode).toBe(200);
      expect(await usedOf('UMAVEZ')).toBe(0);
      expect((await quote({ couponCode: 'UMAVEZ' })).coupon).toMatchObject({ status: 'APPLIED' });

      // Used again, and cancelled by the shop this time.
      const again = await place({ couponCode: 'UMAVEZ' });
      expect(again.statusCode).toBe(201);
      expect(await usedOf('UMAVEZ')).toBe(1);
      await call('PATCH', `/api/stores/lessari/orders/${again.json<CustomerOrder>().number}/status`, owner, { status: 'CANCELLED' });
      expect(await usedOf('UMAVEZ')).toBe(0);

      // The uses stay on the coupon's list, each beside an order that reads cancelled.
      const uses = (await call('GET', `/api/stores/lessari/coupons/${once.id}/redemptions`, owner)).json<CouponRedemptionPage>();
      expect(uses.redemptions.map((use) => use.order.status)).toEqual(['CANCELLED', 'CANCELLED']);
      // An order with no coupon is cancelled as before.
      const plain = (await place()).json<CustomerOrder>();
      expect((await call('POST', `/api/stores/lessari/customer/orders/${plain.number}/cancel`, bia)).statusCode).toBe(200);
      expect(await usedOf('UMAVEZ')).toBe(0);
    });

    it('waives the delivery fee whatever it turns out to be: nothing at first, the whole fee once the shop tells it', async () => {
      const free = await coupon({ code: 'FRETE', kind: 'FREE_SHIPPING', percentBps: null });

      const placed = (await place({ couponCode: 'FRETE', fulfillment: 'DELIVERY' })).json<CustomerOrder>();
      expect(placed).toMatchObject({ deliveryFeeCents: null, couponDiscountCents: 0, discountCents: 0, coupon: { code: 'FRETE', kind: 'FREE_SHIPPING' }, totalCents: 43970 });

      const agreed = (await call('PUT', '/api/stores/lessari/orders/1/delivery-fee', owner, { deliveryFeeCents: 1200 })).json<Order>();
      expect(agreed).toMatchObject({ deliveryFeeCents: 1200, couponDiscountCents: 1200, discountCents: 1200, totalCents: 43970 });
      const uses = (await call('GET', `/api/stores/lessari/coupons/${free.id}/redemptions`, owner)).json<CouponRedemptionPage>();
      expect(uses.redemptions[0]).toMatchObject({ discountCents: 1200 });

      // Told again, lower: the discount follows.
      const lower = (await call('PUT', '/api/stores/lessari/orders/1/delivery-fee', owner, { deliveryFeeCents: 800 })).json<Order>();
      expect(lower).toMatchObject({ deliveryFeeCents: 800, couponDiscountCents: 800, discountCents: 800, totalCents: 43970 });
      expect(refusalOf(await place({ couponCode: 'FRETE' }))).toEqual(['ORDER_COUPON_REFUSED', 'NOT_APPLICABLE']);
    });
  });

  describe("the panel's sale", () => {
    it('is priced by the same calculation: promotions, coupon, then what the shopkeeper typed', async () => {
      await promotion({ name: 'Loja toda', percentBps: 1000 });
      await coupon({ maxUsesPerCustomer: 1 });
      const body = { couponCode: 'bemvindo10', discountCents: 1000, fulfillment: 'DELIVERY', deliveryFeeCents: 1500 };
      await call('POST', '/api/stores/lessari/customers', owner, { name: 'Caio Lima', phone: '(11) 97777-6666', address: paulista });

      const quoted = (await call('POST', '/api/stores/lessari/orders/quote', owner, { items: CART(), customer: { name: 'Caio Lima', phone: '(11) 97777-6666' }, ...body })).json<OrderQuote>();
      expect(quoted).toMatchObject({
        subtotalCents: 43970,
        promotionDiscountCents: 4397,
        coupon: { status: 'APPLIED', code: 'BEMVINDO10' },
        couponDiscountCents: 3957,
        manualDiscountCents: 1000,
        discountCents: 9354,
        deliveryFeeCents: 1500,
        totalCents: 36116,
      });

      const response = await register(body);
      expect(response.statusCode).toBe(201);
      expect(response.json<Order>()).toMatchObject({
        subtotalCents: 43970,
        promotionDiscountCents: 4397,
        couponDiscountCents: 3957,
        discountCents: 9354,
        coupon: { code: 'BEMVINDO10', kind: 'PERCENT' },
        deliveryFeeCents: 1500,
        totalCents: 36116,
      });

      // The customer the order found by phone already used it: the quote says so before the sale is registered.
      const again = (await call('POST', '/api/stores/lessari/orders/quote', owner, { items: CART(), customer: { name: 'Caio', phone: '(11) 97777-6666' }, fulfillment: 'PICKUP', couponCode: 'BEMVINDO10' })).json<OrderQuote>();
      expect(again.coupon).toMatchObject({ status: 'REFUSED', reason: 'CUSTOMER_LIMIT' });
      expect(refusalOf(await register({ couponCode: 'BEMVINDO10' }))).toEqual(['ORDER_COUPON_REFUSED', 'CUSTOMER_LIMIT']);
      // Someone the shop does not know yet has used nothing.
      const fresh = (await call('POST', '/api/stores/lessari/orders/quote', owner, { items: CART(), customer: { name: 'Dani', phone: '(11) 96666-5555' }, fulfillment: 'PICKUP', couponCode: 'BEMVINDO10' })).json<OrderQuote>();
      expect(fresh.coupon).toMatchObject({ status: 'APPLIED' });
      expect(await prisma.customer.count({ where: { name: 'Dani' } })).toBe(0);
    });

    it('takes a free delivery off the fee typed, and refuses a typed discount beyond what is left', async () => {
      await coupon({ code: 'FRETE', kind: 'FREE_SHIPPING', percentBps: null });
      await call('POST', '/api/stores/lessari/customers', owner, { name: 'Caio Lima', phone: '(11) 97777-6666', address: paulista });

      const free = await register({ couponCode: 'FRETE', fulfillment: 'DELIVERY', deliveryFeeCents: 1500 });
      expect(free.json<Order>()).toMatchObject({ deliveryFeeCents: 1500, couponDiscountCents: 1500, discountCents: 1500, totalCents: 43970 });
      // A delivery the shop already made free has no fee to waive: the coupon is not spent on it.
      expect(refusalOf(await register({ couponCode: 'FRETE', fulfillment: 'DELIVERY' }))).toEqual(['ORDER_COUPON_REFUSED', 'NOT_APPLICABLE']);
      expect(await usedOf('FRETE')).toBe(1);

      await promotion({ name: 'Loja toda', percentBps: 1000 });
      // 43970 − 4397 leaves 39573: a typed 39574 is one cent too many.
      const tooMuch = await register({ discountCents: 39574 });
      expect([tooMuch.statusCode, tooMuch.json<ApiErrorBody>().errorCode]).toEqual([400, 'ORDER_DISCOUNT_TOO_LARGE']);
      const quotedTooMuch = await call('POST', '/api/stores/lessari/orders/quote', owner, { items: CART(), fulfillment: 'PICKUP', discountCents: 39574 });
      expect([quotedTooMuch.statusCode, quotedTooMuch.json<ApiErrorBody>().errorCode]).toEqual([400, 'ORDER_DISCOUNT_TOO_LARGE']);
      expect((await register({ discountCents: 39573 })).json<Order>()).toMatchObject({ promotionDiscountCents: 4397, discountCents: 43970, totalCents: 0 });
    });

    it('prices a sale dated in the past with what ran that day', async () => {
      await promotion({ name: 'Semana passada', percentBps: 2000, startsAt: daysFromNow(-10), endsAt: daysFromNow(-5) });
      await promotion({ name: 'Desta semana', percentBps: 1000, startsAt: daysFromNow(-2) });
      await coupon({ code: 'VENCIDO', startsAt: daysFromNow(-10), endsAt: daysFromNow(-5) });

      const today = (await register()).json<Order>();
      expect(today).toMatchObject({ promotionDiscountCents: 4397 });
      expect(today.items[0]).toMatchObject({ promotionName: 'Desta semana' });
      expect(refusalOf(await register({ couponCode: 'VENCIDO' }))).toEqual(['ORDER_COUPON_REFUSED', 'EXPIRED']);

      const then = (await register({ placedAt: daysFromNow(-7), couponCode: 'VENCIDO' })).json<Order>();
      // 20% of each unit, then the coupon's 10% of what is left.
      expect(then).toMatchObject({ promotionDiscountCents: 8794, couponDiscountCents: 3517, coupon: { code: 'VENCIDO' } });
      expect(then.items[0]).toMatchObject({ promotionName: 'Semana passada' });
    });
  });
});
