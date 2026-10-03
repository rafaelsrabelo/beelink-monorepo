// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerOrder, CustomerSavedAddress, Order, OrderQuote, ProductDetail } from '@harness-monorepo/contracts';

// App
import { DestinationGeocoder, type Destination } from '../src/modules/delivery/destination-geocoder.js';
import type { GeoPoint } from '../src/modules/delivery/distance.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

const SHOP: GeoPoint = { latitude: -23.5614, longitude: -46.6559 };

/** The map as the tests draw it: one CEP 2.6 km from the shop, one 10.8 km away. */
const geocoder = {
  locate: async (destination: Destination): Promise<GeoPoint | null> =>
    ({ '01310930': { latitude: -23.5505, longitude: -46.6333 }, '04001000': { latitude: -23.65, longitude: -46.7 } })[destination.zipCode] ?? null,
};

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const home = { zipCode: '01310-930', street: 'Av. Paulista', number: '1000', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP' };
const away = { zipCode: '04001-000', street: 'Rua Longe', number: '50', neighborhood: 'Paraíso', city: 'São Paulo', state: 'SP' };
const near = { upToMeters: 3000, feeCents: 500, windowFromMinutes: 30, windowToMinutes: 50 };
const town = { upToMeters: 8000, feeCents: 900, windowFromMinutes: 40, windowToMinutes: 70 };
const rules = { pickupEnabled: true, ownDeliveryEnabled: true, bands: [near, town], freeAboveCents: 15000, carriersEnabled: false };

describe("an order's delivery, quoted (BEELINK-178)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let shopper: AuthSession;
  let blouse: string;
  let far: string;

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(DestinationGeocoder).useValue(geocoder));
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
    await prisma.store.update({ where: { slug: 'lessari' }, data: SHOP });
    blouse = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Blusa', priceCents: 5000 })).json<ProductDetail>().variants[0]!.id;

    const email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia Cliente', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    await call('PATCH', '/api/stores/lessari/customer/me', shopper, { phone: '(11) 98888-7777' });
    // The first address saved is the default.
    await call('POST', '/api/stores/lessari/customer/addresses', shopper, home);
    far = (await call('POST', '/api/stores/lessari/customer/addresses', shopper, away)).json<CustomerSavedAddress>().id;
  });

  function call(method: 'GET' | 'POST' | 'PATCH' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const save = (body: object = rules) => call('PUT', '/api/stores/lessari/delivery', owner, body);
  const cart = (quantity = 1) => [{ variantId: blouse, quantity }];
  const quote = async (body: object = {}, door = 'cart') =>
    (await call('POST', `/api/stores/lessari/customer/${door}/quote`, shopper, { items: cart(), fulfillment: 'DELIVERY', ...body })).json<OrderQuote>();
  const place = (body: object = {}) => call('POST', '/api/stores/lessari/customer/orders', shopper, { items: cart(), fulfillment: 'DELIVERY', paymentMethod: 'PIX', ...body });

  it("prices the cart with the fee of the shop's own delivery to the customer's address, and lists the ways to get there", async () => {
    await save();

    expect(await quote()).toMatchObject({
      subtotalCents: 5000,
      deliveryFeeCents: 500,
      totalCents: 5500,
      shipping: {
        options: [
          { kind: 'OWN_DELIVERY', feeCents: 500, window: { unit: 'MINUTES', from: 30, to: 50 } },
          { kind: 'PICKUP', feeCents: 0 },
        ],
        ownDelivery: { status: 'QUOTED', distanceMeters: 2603 },
      },
    });
    // The checkout's door, which answers about a code, reads the same.
    expect(await quote({}, 'orders')).toMatchObject({ deliveryFeeCents: 500, totalCents: 5500 });
  });

  it('says the ways to deliver beside a pick-up too, which costs nothing', async () => {
    await save();

    expect(await quote({ fulfillment: 'PICKUP' })).toMatchObject({ deliveryFeeCents: 0, totalCents: 5000, shipping: { options: [{ kind: 'OWN_DELIVERY', feeCents: 500 }, { kind: 'PICKUP' }] } });
  });

  it('says at once that the shop does not deliver to an address past its last band, and still offers the pick-up', async () => {
    await save();

    expect(await quote({ addressId: far })).toMatchObject({
      deliveryFeeCents: null,
      totalCents: 5000,
      shipping: { options: [{ kind: 'PICKUP' }], ownDelivery: { status: 'OUT_OF_RANGE', distanceMeters: 10828, radiusMeters: 8000 } },
    });
  });

  it('writes the order with the fee and the window quoted again as it is placed, and the panel reads the same cents', async () => {
    await save();

    const response = await place({ deliveryFeeCents: 500 });

    expect(response.statusCode).toBe(201);
    const order = response.json<CustomerOrder>();
    expect(order).toMatchObject({ subtotalCents: 5000, deliveryFeeCents: 500, totalCents: 5500, deliveryWindow: { unit: 'MINUTES', from: 30, to: 50 } });
    const panel = (await call('GET', '/api/stores/lessari/orders/1', owner)).json<Order>();
    expect(panel).toMatchObject({ subtotalCents: 5000, deliveryFeeCents: 500, totalCents: 5500, deliveryWindow: { unit: 'MINUTES', from: 30, to: 50 } });
  });

  it('delivers free once the products reach the amount, and a free-delivery coupon takes the fee off below it', async () => {
    await save();
    expect((await place({ items: cart(3), deliveryFeeCents: 0 })).json<CustomerOrder>()).toMatchObject({ deliveryFeeCents: 0, totalCents: 15000 });

    await call('POST', '/api/stores/lessari/coupons', owner, { code: 'FRETE', kind: 'FREE_SHIPPING', percentBps: null, startsAt: new Date(Date.now() - 86_400_000).toISOString() });
    expect(await quote({ couponCode: 'FRETE' }, 'orders')).toMatchObject({ deliveryFeeCents: 500, couponDiscountCents: 500, totalCents: 5000, coupon: { status: 'APPLIED' } });
    expect((await place({ couponCode: 'FRETE', deliveryFeeCents: 500 })).json<CustomerOrder>()).toMatchObject({ deliveryFeeCents: 500, couponDiscountCents: 500, totalCents: 5000 });
  });

  it('refuses a delivery to an address the shop does not reach, saying why, and writes nothing', async () => {
    await save();

    const response = await place({ addressId: far });

    expect(response.json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_SHIPPING_UNAVAILABLE', details: { ownDelivery: { status: 'OUT_OF_RANGE', radiusMeters: 8000 } } });
    expect(await prisma.order.count()).toBe(0);
    expect((await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' } })).orderSequence).toBe(0);
  });

  it('refuses an order whose fee is no longer the one the customer was shown, saying what it is now', async () => {
    await save();
    await save({ ...rules, bands: [{ ...near, feeCents: 700 }, town] });

    expect((await place({ deliveryFeeCents: 500 })).json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_SHIPPING_CHANGED', details: { deliveryFeeCents: 700 } });
    // An order that says no fee is placed at the one quoted now.
    expect((await place()).json<CustomerOrder>()).toMatchObject({ deliveryFeeCents: 700, totalCents: 5700 });
  });

  it('keeps to the ways the shop switched on: no pick-up, no delivery', async () => {
    await save({ ...rules, pickupEnabled: false });
    expect((await quote()).shipping?.options.map((option) => option.kind)).toEqual(['OWN_DELIVERY']);
    expect((await place({ fulfillment: 'PICKUP' })).json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_SHIPPING_UNAVAILABLE' });

    await save({ ...rules, ownDeliveryEnabled: false });
    expect(await quote()).toMatchObject({ deliveryFeeCents: null, shipping: { options: [{ kind: 'PICKUP' }], ownDelivery: { status: 'OFF' } } });
    expect((await place()).json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_SHIPPING_UNAVAILABLE', details: { ownDelivery: { status: 'OFF' } } });
    expect((await place({ fulfillment: 'PICKUP' })).statusCode).toBe(201);
  });

  it('agrees the fee afterwards, as before, for a shop that set no band', async () => {
    expect(await quote()).toMatchObject({ deliveryFeeCents: null, totalCents: 5000, shipping: { ownDelivery: { status: 'AGREE_LATER', reason: 'NO_BANDS' } } });

    expect((await place({ deliveryFeeCents: 500 })).json()).toMatchObject({ errorCode: 'ORDER_SHIPPING_CHANGED', details: { deliveryFeeCents: null } });
    expect((await place({ deliveryFeeCents: null })).json<CustomerOrder>()).toMatchObject({ deliveryFeeCents: null, deliveryWindow: null, totalCents: 5000 });
  });

  it('quotes nothing to a customer with no address, and to a visitor', async () => {
    await save();
    await prisma.customerAddress.deleteMany();

    expect((await quote({ fulfillment: 'PICKUP' })).shipping).toBeNull();
    const visitor = await app.inject({ method: 'POST', url: '/api/stores/lessari/cart/quote', payload: { items: cart() } });
    expect(visitor.json<OrderQuote>()).toMatchObject({ shipping: null, deliveryFeeCents: null });
  });
});
