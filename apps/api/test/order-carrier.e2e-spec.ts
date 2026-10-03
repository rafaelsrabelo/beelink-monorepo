// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerOrder, IntegrationAuthorization, Order, OrderQuote, ProductDetail } from '@harness-monorepo/contracts';

// App
import { MelhorEnvioClient, type MelhorEnvioQuoteRequest, type MelhorEnvioQuotedService } from '../src/modules/integrations/melhor-envio/melhor-envio.client.js';
import { businessDaysAfter } from '../src/modules/orders/business-days.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

const SEDEX: MelhorEnvioQuotedService = { serviceId: 2, service: 'SEDEX', company: 'Correios', priceCents: 2745, daysFrom: 2, daysTo: 3, packages: [] };
const PAC: MelhorEnvioQuotedService = { serviceId: 1, service: 'PAC', company: 'Correios', priceCents: 1820, daysFrom: 6, daysTo: 8, packages: [] };

/** Melhor Envio for a checkout: any code connects, and the carriers answer what `offers` says. */
class FakeMelhorEnvio {
  offers: MelhorEnvioQuotedService[] = [SEDEX, PAC];

  authorizationUrl(_config: unknown, state: string): string {
    return `https://sandbox.melhorenvio.test/oauth/authorize?state=${state}`;
  }

  async exchange() {
    return { accessToken: 'access-1', refreshToken: 'refresh-1', expiresInSeconds: 30 * 24 * 60 * 60 };
  }

  async account() {
    return { id: 'me-1', name: 'Loja Lessari', email: null };
  }

  async quote(_config: unknown, _token: string, request: MelhorEnvioQuoteRequest): Promise<MelhorEnvioQuotedService[]> {
    return this.offers.filter((offer) => !request.serviceIds || request.serviceIds.includes(offer.serviceId));
  }
}

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const home = { zipCode: '30140-071', street: 'Rua da Bahia', number: '1148', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG' };
/** Own delivery with the fee agreed afterwards, pickup, and carriers switched on. */
const rules = { pickupEnabled: true, ownDeliveryEnabled: true, bands: [], freeAboveCents: null, carriersEnabled: true };
const sedex = { kind: 'CARRIER', serviceId: 2 };
const day = (date: Date) => date.toISOString().slice(0, 10);

describe('a carrier chosen at checkout (BEELINK-186)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let shopper: AuthSession;
  let blouse: string;
  const melhorEnvio = new FakeMelhorEnvio();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(MelhorEnvioClient).useValue(melhorEnvio));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    melhorEnvio.offers = [SEDEX, PAC];
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    blouse = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Blusa', priceCents: 5990, weightGrams: 300, lengthMm: 255, widthMm: 200, heightMm: 40 })).json<ProductDetail>().variants[0]!.id;

    const begun = await call('POST', '/api/stores/lessari/integrations/melhor-envio/authorize', owner);
    await call('POST', '/api/integrations/melhor-envio/callback', owner, { code: 'c1', state: new URL(begun.json<IntegrationAuthorization>().url).searchParams.get('state')! });
    await call('PUT', '/api/stores/lessari/delivery', owner, rules);

    const email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia Cliente', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    await call('PATCH', '/api/stores/lessari/customer/me', shopper, { phone: '(11) 98888-7777' });
    await call('POST', '/api/stores/lessari/customer/addresses', shopper, home);
  });

  function call(method: 'GET' | 'POST' | 'PATCH' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const cart = [{ variantId: '', quantity: 1 }];
  const items = () => [{ ...cart[0]!, variantId: blouse }];
  const quote = async (body: object = {}) => (await call('POST', '/api/stores/lessari/customer/cart/quote', shopper, { items: items(), fulfillment: 'DELIVERY', ...body })).json<OrderQuote>();
  const place = (body: object = {}) => call('POST', '/api/stores/lessari/customer/orders', shopper, { items: items(), fulfillment: 'DELIVERY', paymentMethod: 'PIX', ...body });

  it('prices the cart with the fee of the carrier asked about, and with the shop’s own delivery when none is', async () => {
    expect(await quote({ shipping: sedex })).toMatchObject({ subtotalCents: 5990, deliveryFeeCents: 2745, totalCents: 8735, shipping: { carriers: { status: 'QUOTED' } } });
    expect(await quote({ shipping: { kind: 'CARRIER', serviceId: 1 } })).toMatchObject({ deliveryFeeCents: 1820, totalCents: 7810 });
    // The shop set no band: its own delivery's fee is agreed afterwards.
    expect(await quote()).toMatchObject({ deliveryFeeCents: null, totalCents: 5990 });
    expect(await quote({ shipping: { kind: 'OWN_DELIVERY' } })).toMatchObject({ deliveryFeeCents: null });
  });

  it('writes the order with the carrier’s fee and window, and its delivery record with who brings it and the days it should arrive between', async () => {
    const response = await place({ shipping: sedex, deliveryFeeCents: 2745 });

    expect(response.statusCode).toBe(201);
    const order = response.json<CustomerOrder>();
    const placedAt = new Date(order.placedAt);
    // Two to three business days, and the day the shop takes to post.
    expect(order).toMatchObject({
      deliveryFeeCents: 2745,
      totalCents: 8735,
      deliveryWindow: { unit: 'BUSINESS_DAYS', from: 3, to: 4 },
      delivery: { kind: 'CARRIER', carrier: 'Correios', service: 'SEDEX', trackingCode: null, estimateFrom: day(businessDaysAfter(placedAt, 3)), estimateTo: day(businessDaysAfter(placedAt, 4)) },
    });
    const panel = (await call('GET', '/api/stores/lessari/orders/1', owner)).json<Order>();
    expect(panel).toMatchObject({ deliveryFeeCents: 2745, totalCents: 8735, delivery: { kind: 'CARRIER', carrier: 'Correios', service: 'SEDEX' } });
    expect((await prisma.orderDelivery.findFirstOrThrow()).carrierServiceId).toBe(2);
  });

  it('refuses a carrier the quote no longer offers, and a fee that is not the one shown', async () => {
    expect((await place({ shipping: sedex, deliveryFeeCents: 1000 })).json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_SHIPPING_CHANGED', details: { deliveryFeeCents: 2745 } });
    expect((await place({ shipping: { kind: 'CARRIER', serviceId: 99 } })).json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_SHIPPING_UNAVAILABLE', details: { carriers: { status: 'QUOTED' } } });
    expect(await prisma.order.count()).toBe(0);
  });

  it('refuses a carrier named with no service', async () => {
    expect((await place({ shipping: { kind: 'CARRIER' } })).statusCode).toBe(400);
    expect((await place({ shipping: { kind: 'DRONE' } })).statusCode).toBe(400);
  });

  it('writes no delivery record for the shop’s own delivery, nor for a pick-up', async () => {
    expect((await place()).json<CustomerOrder>()).toMatchObject({ delivery: null, deliveryWindow: null });
    expect((await place({ fulfillment: 'PICKUP', shipping: sedex })).json<CustomerOrder>()).toMatchObject({ delivery: null, deliveryFeeCents: 0 });
    expect(await prisma.orderDelivery.count()).toBe(0);
  });

  it('keeps the service chosen when the shopkeeper adds the tracking, and drops it when the delivery stops being a carrier’s', async () => {
    await place({ shipping: sedex });
    const record = '/api/stores/lessari/orders/1/delivery';

    const tracked = await call('PUT', record, owner, { kind: 'CARRIER', carrier: 'Correios', service: 'SEDEX', trackingCode: 'AB123456789BR' });
    expect(tracked.statusCode).toBe(200);
    expect((await prisma.orderDelivery.findFirstOrThrow()).carrierServiceId).toBe(2);

    await call('PUT', record, owner, { kind: 'OWN' });
    expect((await prisma.orderDelivery.findFirstOrThrow()).carrierServiceId).toBeNull();
  });
});
