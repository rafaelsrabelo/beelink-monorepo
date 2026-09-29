// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, CustomerOrder, CustomerOrderPage, CustomerReorder, Order, OrderStockDetails, Product } from '@harness-monorepo/contracts';

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

describe("a shopper's order from the cart", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let shopper: AuthSession;
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
    shopper = await shopperOf('lessari', 'Bia Cliente');
    await call('PATCH', '/api/stores/lessari/customer/me', shopper, { phone: '(11) 98888-7777', address: paulista });
  });

  function call(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
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

  async function flavoured(product: Product, optionName: string, valueName: string): Promise<string> {
    const option = await prisma.productOption.create({
      data: { productId: product.id, name: optionName, values: { create: [{ name: valueName }] } },
      include: { values: true },
    });
    const variant = await variantOf(product);
    await prisma.productVariantValue.create({ data: { variantId: variant, optionId: option.id, valueId: option.values[0]!.id } });
    return variant;
  }

  /** A shopper signed up, confirmed and signed in at one shop. */
  async function shopperOf(slug: string, name: string): Promise<AuthSession> {
    const email = newEmail('cliente');
    await call('POST', `/api/stores/${slug}/customer/register`, undefined, { name, email, password: PASSWORD });
    await verifyEmailOf(app, email);
    return (await call('POST', `/api/stores/${slug}/customer/login`, undefined, { email, password: PASSWORD })).json<AuthSession>();
  }

  function place(payload: object = {}, session: AuthSession = shopper, shop = 'lessari') {
    return call('POST', `/api/stores/${shop}/customer/orders`, session, {
      items: [{ variantId: whey, quantity: 2 }, { variantId: grape, quantity: 1 }],
      fulfillment: 'DELIVERY',
      paymentMethod: 'PIX',
      ...payload,
    });
  }

  it("places the cart as a received order of the shopper's record, priced by the API, going to their address", async () => {
    const response = await place();

    expect(response.statusCode).toBe(201);
    const order = response.json<CustomerOrder>();
    expect(order).toMatchObject({
      number: 1,
      status: 'RECEIVED',
      fulfillment: 'DELIVERY',
      paymentMethod: 'PIX',
      deliveryAddress: { recipientName: 'Bia Cliente', ...paulista },
      subtotalCents: 23970,
      deliveryFeeCents: 0,
      discountCents: 0,
      totalCents: 23970,
    });
    expect(order.items).toEqual([
      expect.objectContaining({ productName: 'Whey', variantLabel: null, unitPriceCents: 8990, quantity: 2, lineTotalCents: 17980 }),
      expect.objectContaining({ productName: 'Creatina', variantLabel: 'Sabor: Uva', unitPriceCents: 5990, quantity: 1 }),
    ]);
    // The shopper's read of it: never the shop's note, who moved it, nor the shop's books.
    expect(Object.keys(order).sort()).toEqual(
      [
        'cancelledBy',
        'delivery',
        'deliveryAddress',
        'deliveryFeeCents',
        'discountCents',
        'events',
        'fulfillment',
        'items',
        'number',
        'paymentMethod',
        'placedAt',
        'placedBy',
        'status',
        'subtotalCents',
        'totalCents',
      ].sort(),
    );

    const panel = (await call('GET', '/api/stores/lessari/orders/1', owner)).json<Order>();
    expect(panel).toMatchObject({ status: 'RECEIVED', customer: { name: 'Bia Cliente', phone: '5511988887777' }, note: null });
    expect(panel.events).toEqual([expect.objectContaining({ status: 'RECEIVED', actor: 'CUSTOMER' })]);
    const record = await prisma.customer.findUniqueOrThrow({ where: { id: panel.customer.id } });
    expect(record).toMatchObject({ ordersCount: 1, totalSpentCents: 23970n });
    expect(record.userId).not.toBeNull();
  });

  it('shares the numbering and the stock with the orders the panel registers, and the shop accepts it there', async () => {
    await prisma.productVariant.update({ where: { id: whey }, data: { trackStock: true, stockQuantity: 5 } });
    await call('POST', '/api/stores/lessari/orders', owner, {
      customer: { name: 'Caio Lima', phone: '11977776666' },
      items: [{ variantId: whey, quantity: 1 }],
      fulfillment: 'PICKUP',
      paymentMethod: 'MONEY',
    });

    const order = (await place()).json<CustomerOrder>();
    expect(order.number).toBe(2);
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: whey } })).stockQuantity).toBe(2);

    const accepted = await call('PATCH', '/api/stores/lessari/orders/2/status', owner, { status: 'ACCEPTED' });
    expect(accepted.json<Order>().events.map((event) => [event.status, event.actor])).toEqual([
      ['RECEIVED', 'CUSTOMER'],
      ['ACCEPTED', 'SHOPKEEPER'],
    ]);
  });

  it('takes a pick-up without an address, and keeps none on it', async () => {
    const nowhere = await shopperOf('lessari', 'Dani Rocha');

    const response = await place({ fulfillment: 'PICKUP' }, nowhere);
    expect(response.statusCode).toBe(201);
    expect(response.json<CustomerOrder>()).toMatchObject({ fulfillment: 'PICKUP', deliveryAddress: null });
  });

  it('refuses what it cannot place, saving nothing — the same refusals as the panel', async () => {
    const nowhere = await shopperOf('lessari', 'Dani Rocha');
    const outraWhey = await variantOf(await addProduct('Whey', 8990, 'outra'));
    await prisma.store.update({ where: { slug: 'lessari' }, data: { paymentMethods: ['PIX'] } });
    const cases: [AuthSession, object, string][] = [
      [nowhere, {}, 'ORDER_DELIVERY_ADDRESS_MISSING'],
      [shopper, { paymentMethod: 'MONEY' }, 'ORDER_PAYMENT_NOT_ACCEPTED'],
      [shopper, { items: [{ variantId: outraWhey, quantity: 1 }] }, 'ORDER_VARIANT_INVALID'],
      [shopper, { items: [{ variantId: whey, quantity: 1 }, { variantId: whey, quantity: 1 }] }, 'ORDER_ITEM_DUPLICATE'],
      // The price is the API's, the customer the session's: a body that says either is refused whole.
      [shopper, { items: [{ variantId: whey, quantity: 1, unitPriceCents: 1 }] }, 'BAD_REQUEST'],
      [shopper, { customer: { name: 'Outra Pessoa', phone: '11911112222' } }, 'BAD_REQUEST'],
      [shopper, { discountCents: 500 }, 'BAD_REQUEST'],
    ];

    for (const [session, payload, errorCode] of cases) {
      const response = await place(payload, session);
      expect(response.statusCode, errorCode).toBe(400);
      expect(response.json(), errorCode).toMatchObject({ errorCode });
    }
    expect(await prisma.order.count()).toBe(0);
  });

  it('refuses a product the shop put back in draft, naming the line — which the panel may still register', async () => {
    const draft = await addProduct('Rascunho', 1000);
    const draftVariant = await variantOf(draft);
    await prisma.product.update({ where: { id: draft.id }, data: { status: 'DRAFT' } });

    const refused = await place({ items: [{ variantId: whey, quantity: 1 }, { variantId: draftVariant, quantity: 1 }] });
    expect(refused.statusCode).toBe(400);
    expect(refused.json()).toMatchObject({ errorCode: 'ORDER_VARIANT_INVALID', details: { variantIds: [draftVariant] } });
    expect(await prisma.order.count()).toBe(0);

    const panel = await call('POST', '/api/stores/lessari/orders', owner, {
      customer: { name: 'Caio Lima', phone: '11977776666' },
      items: [{ variantId: draftVariant, quantity: 1 }],
      fulfillment: 'PICKUP',
      paymentMethod: 'PIX',
    });
    expect(panel.statusCode).toBe(201);
  });

  it('refuses to sell past what is left, naming every short line', async () => {
    await prisma.productVariant.update({ where: { id: whey }, data: { trackStock: true, stockQuantity: 1 } });

    const refused = await place();
    expect(refused.statusCode).toBe(409);
    const body = refused.json<ApiErrorBody>();
    expect(body.errorCode).toBe('ORDER_STOCK_INSUFFICIENT');
    expect((body.details as OrderStockDetails).shortages).toEqual([{ variantId: whey, available: 1 }]);
    expect(await prisma.order.count()).toBe(0);
  });

  it("is the signed-in shopper's alone: no token, a shopkeeper's token and another shop's shopper are all refused", async () => {
    const elsewhere = await shopperOf('outra', 'Eva Nunes');

    const body = { items: [{ variantId: whey, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' };
    expect((await call('POST', '/api/stores/lessari/customer/orders', undefined, body)).statusCode).toBe(401);
    expect((await place({}, owner)).statusCode).toBe(401);
    const stranger = await place({}, elsewhere);
    expect(stranger.statusCode).toBe(401);
    expect(stranger.json()).toMatchObject({ errorCode: 'AUTH_UNAUTHENTICATED' });
    expect((await call('POST', '/api/stores/nenhuma/customer/orders', shopper, body)).statusCode).toBe(404);
    expect(await prisma.order.count()).toBe(0);
  });

  describe("reading and cancelling the shopper's own orders", () => {
    const orders = (query = '', session = shopper) => call('GET', `/api/stores/lessari/customer/orders${query}`, session).then((response) => response.json<CustomerOrderPage>());

    /** The shopper's record at the shop, which the panel registers orders against too. */
    async function recordOf(session: AuthSession): Promise<string> {
      return (await prisma.customer.findFirstOrThrow({ where: { userId: session.user.id } })).id;
    }

    /** An order the shopkeeper registers for this shopper in the panel — accepted at once. */
    async function registered(payload: object = {}) {
      const response = await call('POST', '/api/stores/lessari/orders', owner, {
        customer: { id: await recordOf(shopper) },
        items: [{ variantId: grape, quantity: 1 }],
        fulfillment: 'PICKUP',
        paymentMethod: 'MONEY',
        note: 'Cliente chato, conferir o troco',
        ...payload,
      });
      return response.json<Order>();
    }

    it("lists the shopper's orders, theirs and the ones the shop registered for them, most recent first — and nobody else's", async () => {
      await prisma.productImage.create({ data: { productId: (await prisma.productVariant.findUniqueOrThrow({ where: { id: whey } })).productId, url: 'https://img.test/whey.jpg' } });
      await registered({ placedAt: '2026-01-10T12:00:00.000Z' });
      await place();
      const other = await shopperOf('lessari', 'Outra Pessoa');
      await place({ fulfillment: 'PICKUP' }, other);

      const page = await orders();
      expect(page.orders.map((order) => order.number)).toEqual([2, 1]);
      expect(page.orders[0]).toMatchObject({
        status: 'RECEIVED',
        placedBy: 'CUSTOMER',
        cancelledBy: null,
        recipientName: 'Bia Cliente',
        itemsCount: 3,
        moreItems: 0,
        items: [
          expect.objectContaining({ productName: 'Whey', productSlug: expect.any(String), imageUrl: 'https://img.test/whey.jpg' }),
          expect.objectContaining({ productName: 'Creatina', imageUrl: null }),
        ],
      });
      expect(page.orders[1]).toMatchObject({ number: 1, status: 'ACCEPTED', placedBy: 'SHOP', fulfillment: 'PICKUP', recipientName: null });
      expect(page).toMatchObject({ total: 2, counts: { ALL: 2, ACTIVE: 2, DELIVERED: 0, CANCELLED: 0 } });
      expect((await orders('', other)).orders.map((order) => order.number)).toEqual([3]);
    });

    it('filters by tab, period and search, counting every tab under the period and the search', async () => {
      await registered({ placedAt: '2025-06-10T12:00:00.000Z' });
      await registered({ placedAt: '2026-01-10T12:00:00.000Z' });
      await place();
      await call('PATCH', '/api/stores/lessari/orders/1/status', owner, { status: 'DELIVERED' });

      const delivered = await orders('?situation=DELIVERED');
      expect(delivered.orders.map((order) => order.number)).toEqual([1]);
      expect(delivered.counts).toEqual({ ALL: 3, ACTIVE: 2, DELIVERED: 1, CANCELLED: 0 });
      // The order placed now is this year's in Brasília, whichever year the suite runs in.
      const thisYear = Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(new Date()));
      expect(delivered.years).toEqual([...new Set([thisYear, 2026, 2025])]);

      expect((await orders('?period=2025')).orders.map((order) => order.number)).toEqual([1]);
      expect((await orders('?period=3m')).orders.map((order) => order.number)).toEqual([3]);
      expect((await orders('?q=whey')).orders.map((order) => order.number)).toEqual([3]);
      expect((await orders('?q=%232')).orders.map((order) => order.number)).toEqual([2]);
      // Every tab counts under the search and the period — and never under the tab chosen.
      expect((await orders('?q=whey&situation=DELIVERED')).counts).toEqual({ ALL: 1, ACTIVE: 1, DELIVERED: 0, CANCELLED: 0 });
      const in2025 = await orders('?period=2025&situation=ACTIVE');
      expect(in2025.orders).toEqual([]);
      expect(in2025.counts).toEqual({ ALL: 1, ACTIVE: 0, DELIVERED: 1, CANCELLED: 0 });
      expect((await orders('?pageSize=1&page=2')).orders.map((order) => order.number)).toEqual([2]);
      expect((await call('GET', '/api/stores/lessari/customer/orders?period=ontem', shopper)).statusCode).toBe(400);
    });

    it("opens one order with its lines, totals, address and timeline — never the shop's note or who moved it", async () => {
      await registered();
      await call('PATCH', '/api/stores/lessari/orders/1/status', owner, { status: 'PREPARING' });

      const response = await call('GET', '/api/stores/lessari/customer/orders/1', shopper);
      expect(response.statusCode).toBe(200);
      const order = response.json<CustomerOrder>();
      expect(order).toMatchObject({ number: 1, status: 'PREPARING', placedBy: 'SHOP', paymentMethod: 'MONEY', totalCents: 5990 });
      expect(order.events.map((event) => event.status)).toEqual(['ACCEPTED', 'PREPARING']);
      expect(order.events.every((event) => Object.keys(event).sort().join() === 'at,status')).toBe(true);
      expect(JSON.stringify(order)).not.toContain('troco');
      expect(order).not.toHaveProperty('note');
      expect(order).not.toHaveProperty('customer');
    });

    /** The storefront opens a product's page only while it is on sale: a slug past that is a link to a 404. */
    it('leads a line to its product only while the product is on sale, and keeps its photo either way', async () => {
      const product = (await prisma.productVariant.findUniqueOrThrow({ where: { id: whey } })).productId;
      await prisma.productImage.create({ data: { productId: product, url: 'https://img.test/whey.jpg' } });
      await place();

      const onSale = (await orders()).orders[0]!.items[0]!;
      expect(onSale).toMatchObject({ productName: 'Whey', productSlug: expect.any(String) });

      await prisma.product.update({ where: { id: product }, data: { status: 'DRAFT' } });
      const offSale = { productName: 'Whey', productSlug: null, imageUrl: 'https://img.test/whey.jpg' };
      expect((await orders()).orders[0]!.items[0]).toMatchObject(offSale);
      expect((await call('GET', '/api/stores/lessari/customer/orders/1', shopper)).json<CustomerOrder>().items[0]).toMatchObject(offSale);
    });

    it("tells the delivery on the shop's side, and the shopper reads who brings it, its tracking and its window", async () => {
      await place();
      const put = (payload: object, session = owner, number = 1) => call('PUT', `/api/stores/lessari/orders/${number}/delivery`, session, payload);
      const told = { kind: 'CARRIER', carrier: 'Correios', service: 'SEDEX', trackingCode: 'AB123456789BR', estimateFrom: '2026-09-25', estimateTo: '2026-09-26' };

      const set = await put(told);
      expect(set.statusCode).toBe(200);
      // No link given: a Correios code leads to their own page.
      const delivery = { ...told, trackingUrl: 'https://rastreamento.correios.com.br/app/index.php' };
      expect(set.json<Order>().delivery).toEqual(delivery);

      const mine = await call('GET', '/api/stores/lessari/customer/orders/1', shopper);
      expect(mine.json<CustomerOrder>().delivery).toEqual(delivery);
      expect((await orders()).orders[0]).toMatchObject({ estimate: { from: '2026-09-25', to: '2026-09-26' } });

      // Replaced whole: the shop's own link wins, and a field left out is cleared.
      const own = await put({ kind: 'OWN', trackingUrl: 'https://entregas.lessari.com/1' });
      expect(own.json<Order>().delivery).toEqual({ kind: 'OWN', carrier: null, service: null, trackingCode: null, trackingUrl: 'https://entregas.lessari.com/1', estimateFrom: null, estimateTo: null });
      expect((await orders()).orders[0]!.estimate).toBeNull();

      const cleared = await call('DELETE', '/api/stores/lessari/orders/1/delivery', owner);
      expect(cleared.json<Order>().delivery).toBeNull();
    });

    it('refuses a window that is half or backwards, a link that is not https, a pick-up, and anyone but the shop', async () => {
      await place();
      await registered();
      const put = (payload: object, session = owner, number = 1) => call('PUT', `/api/stores/lessari/orders/${number}/delivery`, session, payload);

      expect((await put({ kind: 'OWN', estimateFrom: '2026-09-25' })).json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_DELIVERY_WINDOW_INVALID' });
      expect((await put({ kind: 'OWN', estimateFrom: '2026-09-26', estimateTo: '2026-09-25' })).json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_DELIVERY_WINDOW_INVALID' });
      expect((await put({ kind: 'OWN', estimateFrom: '2026-02-30', estimateTo: '2026-03-01' })).statusCode).toBe(400);
      expect((await put({ kind: 'OWN', trackingUrl: 'http://entregas.lessari.com/1' })).statusCode).toBe(400);
      expect((await put({ kind: 'BICICLETA' })).statusCode).toBe(400);
      // Order 2 is the shop's pick-up.
      expect((await put({ kind: 'OWN' }, owner, 2)).json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_DELIVERY_FOR_PICKUP' });
      expect((await put({ kind: 'OWN' }, shopper)).statusCode).toBe(401);
      expect(await prisma.orderDelivery.count()).toBe(0);
    });

    it('reads an order again against today: what goes back into the cart, and what stays out and why', async () => {
      await place();
      const reorder = () => call('GET', '/api/stores/lessari/customer/orders/1/reorder', shopper);

      const all = await reorder();
      expect(all.statusCode).toBe(200);
      expect(all.json<CustomerReorder>()).toEqual({
        number: 1,
        // The whey has no options: named by its product alone, as the cart names it.
        lines: [
          { productId: expect.any(String), variantId: null, quantity: 2 },
          { productId: expect.any(String), variantId: grape, quantity: 1 },
        ],
        left: [],
      });

      // Fewer left than the order had: in, with what there is. The grape's product off sale: out.
      await prisma.productVariant.update({ where: { id: whey }, data: { trackStock: true, stockQuantity: 1 } });
      const grapeProduct = (await prisma.productVariant.findUniqueOrThrow({ where: { id: grape } })).productId;
      await prisma.product.update({ where: { id: grapeProduct }, data: { status: 'DRAFT' } });
      const some = (await reorder()).json<CustomerReorder>();
      expect(some.lines).toEqual([{ productId: expect.any(String), variantId: null, quantity: 1 }]);
      expect(some.left).toEqual([
        { productName: 'Whey', variantLabel: null, reason: 'LIMITED', added: 1 },
        { productName: 'Creatina', variantLabel: 'Sabor: Uva', reason: 'OFF_SALE', added: 0 },
      ]);

      await prisma.productVariant.update({ where: { id: whey }, data: { stockQuantity: 0 } });
      expect((await reorder()).json<CustomerReorder>().left[0]).toMatchObject({ productName: 'Whey', reason: 'SOLD_OUT', added: 0 });

      // Another customer's order is no order of theirs.
      const other = await shopperOf('lessari', 'Outra Pessoa');
      const stranger = await call('GET', '/api/stores/lessari/customer/orders/1/reorder', other);
      expect(stranger.statusCode).toBe(404);
      expect(stranger.json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_NOT_FOUND' });
      expect((await call('GET', '/api/stores/lessari/customer/orders/1/reorder')).statusCode).toBe(401);
    });

    it('cancels an order the shop has not accepted, giving its stock back; after that only the shop cancels', async () => {
      await prisma.productVariant.update({ where: { id: whey }, data: { trackStock: true, stockQuantity: 5 } });
      await place();
      await registered();

      const cancelled = await call('POST', '/api/stores/lessari/customer/orders/1/cancel', shopper);
      expect(cancelled.statusCode).toBe(200);
      expect(cancelled.json<CustomerOrder>()).toMatchObject({ status: 'CANCELLED', cancelledBy: 'CUSTOMER' });
      expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: whey } })).stockQuantity).toBe(5);
      const panel = (await call('GET', '/api/stores/lessari/orders/1', owner)).json<Order>();
      expect(panel.events.map((event) => [event.status, event.actor])).toEqual([
        ['RECEIVED', 'CUSTOMER'],
        ['CANCELLED', 'CUSTOMER'],
      ]);
      expect(await prisma.customer.findUniqueOrThrow({ where: { id: await recordOf(shopper) } })).toMatchObject({ ordersCount: 1 });

      // Accepted by the shop: the shop's to cancel. Already cancelled: said as cancelled, not as accepted.
      for (const [number, errorCode] of [[2, 'ORDER_NOT_CANCELLABLE'], [1, 'ORDER_CANCELLED']] as const) {
        const refused = await call('POST', `/api/stores/lessari/customer/orders/${number}/cancel`, shopper);
        expect(refused.statusCode, errorCode).toBe(409);
        expect(refused.json(), errorCode).toMatchObject({ errorCode });
      }

      await call('PATCH', '/api/stores/lessari/orders/2/status', owner, { status: 'CANCELLED' });
      expect((await call('GET', '/api/stores/lessari/customer/orders/2', shopper)).json<CustomerOrder>()).toMatchObject({ cancelledBy: 'SHOP' });
      expect((await orders()).counts).toMatchObject({ CANCELLED: 2, ACTIVE: 0 });
    });

    it("answers another customer's order, another shop's and a number that is none as not found", async () => {
      const other = await shopperOf('lessari', 'Outra Pessoa');
      await place({ fulfillment: 'PICKUP' }, other);
      const elsewhere = await shopperOf('outra', 'Eva Nunes');

      for (const [url, session] of [
        ['/api/stores/lessari/customer/orders/1', shopper],
        ['/api/stores/lessari/customer/orders/1/cancel', shopper],
        ['/api/stores/lessari/customer/orders/abc', shopper],
      ] as const) {
        const response = await call(url.endsWith('cancel') ? 'POST' : 'GET', url, session);
        expect(response.statusCode, url).toBe(404);
        expect(response.json(), url).toMatchObject({ errorCode: 'ORDER_NOT_FOUND' });
      }
      expect((await call('GET', '/api/stores/lessari/customer/orders', elsewhere)).statusCode).toBe(401);
      expect((await call('GET', '/api/stores/lessari/customer/orders', owner)).statusCode).toBe(401);
      expect((await prisma.order.findFirstOrThrow()).status).toBe('RECEIVED');
    });
  });
});
