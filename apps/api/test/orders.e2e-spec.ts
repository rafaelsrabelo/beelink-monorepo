// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, Order, OrderPage, Product } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

describe("a shop's orders", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let whey: string;
  let grape: string;

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
    whey = await variantOf(await addProduct('Whey', 8990));
    grape = await flavoured(await addProduct('Creatina', 5990), 'Sabor', 'Uva');
  });

  function call(method: 'GET' | 'POST' | 'PATCH', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function addProduct(name: string, priceCents: number, shop = 'lessari'): Promise<Product> {
    const response = await call('POST', `/api/stores/${shop}/products`, owner, { name, priceCents });
    if (response.statusCode !== 201) throw new Error(`POST products answered ${response.statusCode}: ${response.payload}`);
    return response.json<Product>();
  }

  async function variantOf(product: Product): Promise<string> {
    return (await prisma.productVariant.findFirstOrThrow({ where: { productId: product.id } })).id;
  }

  /** The product's default variant, given one option and value — the way the variations editor writes it. */
  async function flavoured(product: Product, optionName: string, valueName: string): Promise<string> {
    const option = await prisma.productOption.create({
      data: { productId: product.id, name: optionName, values: { create: [{ name: valueName }] } },
      include: { values: true },
    });
    const variant = await variantOf(product);
    await prisma.productVariantValue.create({ data: { variantId: variant, optionId: option.id, valueId: option.values[0]!.id } });
    return variant;
  }

  const bia = { name: 'Bia Souza', phone: '(11) 98888-7777' };

  function place(payload: object = {}, shop = 'lessari') {
    return call('POST', `/api/stores/${shop}/orders`, owner, {
      customer: bia,
      items: [{ variantId: whey, quantity: 2 }, { variantId: grape, quantity: 1 }],
      fulfillment: 'DELIVERY',
      deliveryFeeCents: 1000,
      discountCents: 500,
      paymentMethod: 'PIX',
      ...payload,
    });
  }

  it('registers an order: accepted, numbered, priced by the API and on the customer\'s books', async () => {
    const response = await place({ note: 'Entregar depois das 18h' });

    expect(response.statusCode).toBe(201);
    const order = response.json<Order>();
    expect(order).toMatchObject({
      number: 1,
      status: 'ACCEPTED',
      customer: { name: 'Bia Souza', phone: '5511988887777', address: { city: null } },
      subtotalCents: 23970,
      deliveryFeeCents: 1000,
      discountCents: 500,
      totalCents: 24470,
      note: 'Entregar depois das 18h',
    });
    expect(order.items).toEqual([
      expect.objectContaining({ productName: 'Whey', variantLabel: null, unitPriceCents: 8990, quantity: 2, lineTotalCents: 17980 }),
      expect.objectContaining({ productName: 'Creatina', variantLabel: 'Sabor: Uva', unitPriceCents: 5990, quantity: 1 }),
    ]);
    expect(order.events).toEqual([expect.objectContaining({ status: 'ACCEPTED', actor: 'SHOPKEEPER' })]);

    const books = await prisma.customer.findUniqueOrThrow({ where: { id: order.customer.id } });
    expect(books).toMatchObject({ ordersCount: 1, totalSpentCents: 24470n });
    expect(books.lastOrderAt?.toISOString()).toBe(order.placedAt);
  });

  it('numbers two orders placed at once consecutively, and another shop starts at one', async () => {
    const outraWhey = await variantOf(await addProduct('Whey', 8990, 'outra'));

    const numbers = (await Promise.all([place(), place(), place()])).map((response) => response.json<Order>().number);
    expect([...numbers].sort()).toEqual([1, 2, 3]);

    const elsewhere = await place({ items: [{ variantId: outraWhey, quantity: 1 }] }, 'outra');
    expect(elsewhere.json<Order>().number).toBe(1);
  });

  it('keeps its photographs when the price changes or the product is deleted', async () => {
    const order = (await place()).json<Order>();

    await prisma.productVariant.update({ where: { id: whey }, data: { priceCents: 1 } });
    await prisma.product.deleteMany({ where: { name: 'Creatina' } });

    const read = (await call('GET', '/api/stores/lessari/orders/1', owner)).json<Order>();
    expect(read.totalCents).toBe(order.totalCents);
    expect(read.items[0]).toMatchObject({ productName: 'Whey', unitPriceCents: 8990 });
    expect(read.items[1]).toMatchObject({ productName: 'Creatina', variantLabel: 'Sabor: Uva', productId: null, variantId: null });
  });

  it('takes a cancelled order off the customer\'s books, and a cancelled order moves no more', async () => {
    const old = (await place({ placedAt: '2026-09-01T12:00:00.000Z' })).json<Order>();
    await place();

    const moved = await call('PATCH', '/api/stores/lessari/orders/2/status', owner, { status: 'PREPARING' });
    expect(moved.json<Order>().events.map((event) => event.status)).toEqual(['ACCEPTED', 'PREPARING']);
    expect((await call('PATCH', '/api/stores/lessari/orders/2/status', owner, { status: 'PREPARING' })).json()).toMatchObject({
      errorCode: 'ORDER_STATUS_UNCHANGED',
    });

    expect((await call('PATCH', '/api/stores/lessari/orders/2/status', owner, { status: 'CANCELLED' })).statusCode).toBe(200);
    const books = await prisma.customer.findUniqueOrThrow({ where: { id: old.customer.id } });
    expect(books).toMatchObject({ ordersCount: 1, totalSpentCents: BigInt(old.totalCents) });
    expect(books.lastOrderAt?.toISOString()).toBe('2026-09-01T12:00:00.000Z');

    const again = await call('PATCH', '/api/stores/lessari/orders/2/status', owner, { status: 'DELIVERED' });
    expect(again.statusCode).toBe(409);
    expect(again.json()).toMatchObject({ errorCode: 'ORDER_CANCELLED' });
  });

  it("is the owner's alone: another of their shops, a stranger and a shopper's token all get nothing", async () => {
    await place();

    expect((await call('GET', '/api/stores/outra/orders/1', owner)).json()).toMatchObject({ errorCode: 'ORDER_NOT_FOUND' });
    const stranger = await signUpAndSignIn(app, newEmail('estranho'));
    expect((await call('GET', '/api/stores/lessari/orders', stranger)).statusCode).toBe(403);

    const email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Cliente', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    const shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    expect((await call('GET', '/api/stores/lessari/orders', shopper)).statusCode).toBe(401);
  });

  it('refuses what it cannot price or place, and saves nothing', async () => {
    const outraWhey = await variantOf(await addProduct('Whey', 8990, 'outra'));
    const pricey = await variantOf(await addProduct('Caro', 60_000_000));
    await prisma.store.update({ where: { slug: 'lessari' }, data: { paymentMethods: ['PIX'] } });
    const cases: [object, string][] = [
      [{ items: [{ variantId: outraWhey, quantity: 1 }] }, 'ORDER_VARIANT_INVALID'],
      [{ items: [{ variantId: whey, quantity: 1 }, { variantId: whey, quantity: 2 }] }, 'ORDER_ITEM_DUPLICATE'],
      [{ paymentMethod: 'MONEY' }, 'ORDER_PAYMENT_NOT_ACCEPTED'],
      [{ placedAt: new Date(Date.now() + 3_600_000).toISOString() }, 'ORDER_PLACED_IN_FUTURE'],
      [{ discountCents: 999_999 }, 'ORDER_DISCOUNT_TOO_LARGE'],
      [{ customer: { id: '01999999-0000-7000-8000-000000000000' } }, 'ORDER_CUSTOMER_NOT_FOUND'],
      [{ items: [{ variantId: whey, quantity: 0 }] }, 'BAD_REQUEST'],
      // ISO-shaped, and no day at all.
      [{ placedAt: '2026-02-30T12:00:00Z' }, 'BAD_REQUEST'],
      [{ items: [{ variantId: pricey, quantity: 2 }], fulfillment: 'PICKUP' }, 'ORDER_TOTAL_TOO_LARGE'],
    ];

    for (const [payload, errorCode] of cases) {
      const response = await place(payload);
      expect(response.statusCode, errorCode).toBe(400);
      expect(response.json(), errorCode).toMatchObject({ errorCode });
    }
    expect(await prisma.order.count()).toBe(0);
  });

  it("finds a customer the shop knows by the phone, however it is written, keeping their name", async () => {
    const first = (await place()).json<Order>();

    for (const phone of ['11 98888 7777', '+55 11 98888-7777', '(011) 98888-7777']) {
      const again = (await place({ customer: { name: 'Outro Nome', phone } })).json<Order>();
      expect(again.customer, phone).toEqual(first.customer);
    }
    expect(await prisma.customer.count()).toBe(1);
  });

  it('takes an id in capitals, and names what an out-of-range number cannot be', async () => {
    expect((await place({ items: [{ variantId: whey.toUpperCase(), quantity: 1 }] })).statusCode).toBe(201);

    for (const number of ['2147483648', '99999999999', 'abc', '0']) {
      const response = await call('GET', `/api/stores/lessari/orders/${number}`, owner);
      expect(response.statusCode, number).toBe(404);
      expect(response.json(), number).toMatchObject({ errorCode: 'ORDER_NOT_FOUND' });
    }
    expect((await call('GET', '/api/stores/lessari/orders?page=99999999', owner)).statusCode).toBe(400);
  });

  it("leaves the shop's own updatedAt alone: an order is not an edit of the shop", async () => {
    const before = (await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' } })).updatedAt;

    await place();
    await call('PATCH', '/api/stores/lessari/orders/1/status', owner, { status: 'PREPARING' });

    expect((await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' } })).updatedAt).toEqual(before);
  });

  // The catalog allows three options of 40 characters, each with a value of 60.
  it('photographs the longest variant label the catalog allows', async () => {
    const product = await addProduct('Kit', 1000);
    const variant = await variantOf(product);
    for (const position of [0, 1, 2]) {
      const option = await prisma.productOption.create({
        data: { productId: product.id, name: `${position}`.repeat(40), position, values: { create: [{ name: 'v'.repeat(60) }] } },
        include: { values: true },
      });
      await prisma.productVariantValue.create({ data: { variantId: variant, optionId: option.id, valueId: option.values[0]!.id } });
    }

    const response = await place({ items: [{ variantId: variant, quantity: 1 }] });
    expect(response.statusCode).toBe(201);
    expect(response.json<Order>().items[0]!.variantLabel).toHaveLength(312);
  });

  it('lists the most recent first, and finds by status, number, name and phone', async () => {
    await place({ placedAt: '2026-09-01T12:00:00.000Z' });
    await place({ customer: { name: 'Caio Lima', phone: '11977776666' } });
    await call('PATCH', '/api/stores/lessari/orders/2/status', owner, { status: 'DELIVERED' });
    const list = (query = '') => call('GET', `/api/stores/lessari/orders${query}`, owner).then((response) => response.json<OrderPage>());

    expect((await list()).orders.map((order) => order.number)).toEqual([2, 1]);
    expect((await list()).orders[0]).toMatchObject({ itemsCount: 3, customer: { name: 'Caio Lima' } });
    expect((await list('?status=DELIVERED')).orders.map((order) => order.number)).toEqual([2]);
    expect((await list('?q=%231')).orders.map((order) => order.number)).toEqual([1]);
    expect((await list('?q=bia')).orders.map((order) => order.number)).toEqual([1]);
    expect((await list('?q=97777')).orders.map((order) => order.number)).toEqual([2]);
    expect(await list('?pageSize=1&page=2')).toMatchObject({ total: 2, page: 2, pageSize: 1, orders: [{ number: 1 }] });
  });
});
