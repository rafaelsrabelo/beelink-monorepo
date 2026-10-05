// Node
import { createHmac } from 'node:crypto';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerOrder, IntegrationAuthorization, Order, ProductDetail } from '@harness-monorepo/contracts';

// App
import { LabelTrackingRoutine } from '../src/modules/carrier-tracking/label-tracking.routine.js';
import { MelhorEnvioClient, type MelhorEnvioQuotedService } from '../src/modules/integrations/melhor-envio/melhor-envio.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

/** The app's secret in the e2e environment (`vitest.config.e2e.ts`): what Melhor Envio signs with. */
const SECRET = 'test-melhor-envio-secret';
const LABEL = '9b5c4ad3-6f0e-4b7a-9d4c-0d6a4b0c8f11';
const SEDEX: MelhorEnvioQuotedService = { serviceId: 2, service: 'SEDEX', company: 'Correios', priceCents: 2745, daysFrom: 2, daysTo: 3, packages: [] };

/** Melhor Envio for a label bought and then tracked: the check answers what `status` says. */
class FakeMelhorEnvio {
  status = 'released';
  trackingCode: string | null = null;
  asked = 0;

  authorizationUrl(_config: unknown, state: string) {
    return `https://sandbox.melhorenvio.test/oauth/authorize?state=${state}`;
  }
  async exchange() {
    return { accessToken: 'access-1', refreshToken: 'refresh-1', expiresInSeconds: 30 * 24 * 60 * 60 };
  }
  async account() {
    return { id: 'me-1', name: 'Loja Lessari', email: 'envios@lessari.com.br' };
  }
  async quote() {
    return [SEDEX];
  }
  async balanceCents() {
    return 10_000;
  }
  async addToCart() {
    return { id: LABEL, protocol: 'ORD-1', priceCents: 2745 };
  }
  async checkout() {}
  async generate() {
    return { generated: true, message: null };
  }
  async tracking() {
    this.asked += 1;
    return { status: this.status, trackingCode: this.trackingCode };
  }
}

function shopBody(slug: string) {
  return { name: 'Loja Lessari', slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

describe('a carrier moving an order along (BEELINK-188)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let shopperEmail: string;
  let melhorEnvio: FakeMelhorEnvio;

  beforeAll(async () => {
    melhorEnvio = new FakeMelhorEnvio();
    app = await createTestApp((builder) => builder.overrideProvider(MelhorEnvioClient).useValue(melhorEnvio));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    Object.assign(melhorEnvio, { status: 'released', trackingCode: null, asked: 0 });

    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    await prisma.store.update({ where: { slug: 'lessari' }, data: { addressStreet: 'Rua Augusta', addressNumber: '1500', addressNeighborhood: 'Consolação' } });
    const blouse = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Blusa', priceCents: 5990, weightGrams: 300, lengthMm: 255, widthMm: 200, heightMm: 40 })).json<ProductDetail>().variants[0]!.id;
    const begun = await call('POST', '/api/stores/lessari/integrations/melhor-envio/authorize', owner);
    await call('POST', '/api/integrations/melhor-envio/callback', owner, { code: 'c1', state: new URL(begun.json<IntegrationAuthorization>().url).searchParams.get('state')! });
    await call('PUT', '/api/stores/lessari/delivery', owner, { pickupEnabled: true, ownDeliveryEnabled: false, bands: [], freeAboveCents: null, carriersEnabled: true });
    await call('PUT', '/api/stores/lessari/integrations/melhor-envio/settings', owner, { handlingDays: 1, serviceIds: [2], defaultPackage: null, senderDocument: '11222333000181' });

    shopperEmail = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia Cliente', email: shopperEmail, password: PASSWORD });
    await verifyEmailOf(app, shopperEmail);
    const shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email: shopperEmail, password: PASSWORD })).json<AuthSession>();
    await call('PATCH', '/api/stores/lessari/customer/me', shopper, { phone: '(11) 98888-7777', cpf: '529.982.247-25' });
    await call('POST', '/api/stores/lessari/customer/addresses', shopper, { zipCode: '30140-071', street: 'Rua da Bahia', number: '1148', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG' });
    await call('POST', '/api/stores/lessari/customer/orders', shopper, { items: [{ variantId: blouse, quantity: 1 }], fulfillment: 'DELIVERY', paymentMethod: 'PIX', shipping: { kind: 'CARRIER', serviceId: 2 } });
    await call('PATCH', '/api/stores/lessari/orders/1/status', owner, { status: 'PREPARING' });
    expect((await call('POST', '/api/stores/lessari/orders/1/label', owner, { volume: { weightGrams: 600, lengthMm: 260, widthMm: 200, heightMm: 80 } })).statusCode).toBe(200);
    await clearInbox();
  });

  function call(method: 'GET' | 'POST' | 'PATCH' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  /** A webhook as Melhor Envio sends it: the body, and its signature over those very bytes. */
  function webhook(event: string, data: object, secret = SECRET) {
    const body = JSON.stringify({ event, data: { id: LABEL, protocol: 'ORD-1', tracking: null, tracking_url: null, ...data } });
    const signature = createHmac('sha256', secret).update(body).digest('base64');
    return app.inject({ method: 'POST', url: '/api/integrations/melhor-envio/webhook', headers: { 'content-type': 'application/json', 'x-me-signature': signature }, payload: body });
  }

  const order = async () => (await call('GET', '/api/stores/lessari/orders/1', owner)).json<Order>();

  it('moves the order out for delivery when the carrier posts it, with the carrier as its author and the tracking on its record', async () => {
    const response = await webhook('order.posted', { status: 'posted', tracking: 'ME23002OWZ7BR', tracking_url: 'https://www.melhorrastreio.com.br/rastreio/ME23002OWZ7BR' });

    expect(response.json()).toEqual({ result: 'APPLIED' });
    const moved = await order();
    expect(moved.status).toBe('OUT_FOR_DELIVERY');
    expect(moved.events.at(-1)).toMatchObject({ status: 'OUT_FOR_DELIVERY', actor: 'CARRIER' });
    expect(moved.delivery).toMatchObject({ kind: 'CARRIER', trackingCode: 'ME23002OWZ7BR', trackingUrl: 'https://www.melhorrastreio.com.br/rastreio/ME23002OWZ7BR' });
    // The customer hears of it as sent, by whom, and how to follow it, without opening the order (BEELINK-258).
    const sent = await waitForMessage(shopperEmail);
    // SMTP carries the text's lines as CRLF.
    const text = sent.Text.replaceAll('\r\n', '\n');
    expect(sent.Subject).toBe('Loja Lessari — pedido nº 1 enviado');
    expect(text).toContain('Seu pedido nº 1 em Loja Lessari foi enviado pela transportadora Correios (SEDEX).');
    expect(text).toContain('Código de rastreio: ME23002OWZ7BR\nVer no site da transportadora:\nhttps://www.melhorrastreio.com.br/rastreio/ME23002OWZ7BR');
    expect(sent.HTML).toContain('href="https://www.melhorrastreio.com.br/rastreio/ME23002OWZ7BR"');
  });

  it('sends the e-mail once, with the tracking there is when it goes: a code that comes later is read on the order', async () => {
    await webhook('order.posted', { status: 'posted' });
    const sent = await waitForMessage(shopperEmail, 10_000, 'enviado');
    expect(sent.Text.replaceAll('\r\n', '\n')).toContain('foi enviado pela transportadora Correios (SEDEX).\n\nO código de rastreio aparece no pedido assim que for informado.');

    // The code arriving later — with the same event sent again — lands on the order, and owes no second e-mail.
    expect((await webhook('order.posted', { status: 'posted', tracking: 'ME23002OWZ7BR' })).json()).toEqual({ result: 'DUPLICATE' });
    expect((await order()).delivery).toMatchObject({ trackingCode: 'ME23002OWZ7BR' });
    expect(await prisma.orderStatusEmail.findMany({ select: { status: true, sentAt: true } })).toEqual([{ status: 'OUT_FOR_DELIVERY', sentAt: expect.any(Date) }]);
  });

  it('delivers the order when the carrier does, and never moves it back for a "posted" that arrives late', async () => {
    await webhook('order.delivered', { status: 'delivered' });
    expect((await order()).status).toBe('DELIVERED');

    expect((await webhook('order.posted', { status: 'posted' })).json()).toEqual({ result: 'APPLIED' });
    expect((await order()).status).toBe('DELIVERED');
  });

  it('applies each event once, however often it arrives', async () => {
    expect((await webhook('order.posted', { status: 'posted' })).json()).toEqual({ result: 'APPLIED' });
    expect((await webhook('order.posted', { status: 'posted' })).json()).toEqual({ result: 'DUPLICATE' });

    expect((await order()).events.filter((event) => event.status === 'OUT_FOR_DELIVERY')).toHaveLength(1);
  });

  it('refuses a webhook not signed by the app, and changes nothing', async () => {
    expect((await webhook('order.delivered', { status: 'delivered' }, 'another-secret')).json()).toMatchObject({ statusCode: 401, errorCode: 'INTEGRATION_SIGNATURE_INVALID' });
    const unsigned = await app.inject({ method: 'POST', url: '/api/integrations/melhor-envio/webhook', headers: { 'content-type': 'application/json' }, payload: { event: 'order.delivered', data: { id: LABEL, status: 'delivered' } } });
    expect(unsigned.statusCode).toBe(401);
    expect((await order()).status).toBe('PREPARING');
  });

  it('answers 200 to a label bee-link never bought, so Melhor Envio does not try again', async () => {
    const body = JSON.stringify({ event: 'order.posted', data: { id: 'someone-elses-label', status: 'posted' } });
    const response = await app.inject({ method: 'POST', url: '/api/integrations/melhor-envio/webhook', headers: { 'content-type': 'application/json', 'x-me-signature': createHmac('sha256', SECRET).update(body).digest('base64') }, payload: body });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ result: 'UNKNOWN' });
  });

  it('cancels the label the carrier cancelled', async () => {
    await webhook('order.cancelled', { status: 'canceled' });

    expect((await prisma.orderLabel.findFirstOrThrow()).status).toBe('CANCELLED');
  });

  it("checks after the labels the webhook missed, and a fact both reach is applied once", async () => {
    const routine = app.get(LabelTrackingRoutine);
    const later = new Date(Date.now() + 60 * 60 * 1000);

    melhorEnvio.status = 'posted';
    melhorEnvio.trackingCode = 'ME23002OWZ7BR';
    expect(await routine.checkDue(later)).toBe(1);
    expect(await order()).toMatchObject({ status: 'OUT_FOR_DELIVERY', delivery: { trackingCode: 'ME23002OWZ7BR' } });

    // The webhook arriving after the check finds the fact applied.
    expect((await webhook('order.posted', { status: 'posted' })).json()).toEqual({ result: 'DUPLICATE' });

    melhorEnvio.status = 'delivered';
    await routine.checkDue(later);
    expect((await order()).status).toBe('DELIVERED');
    // A delivered order is not asked about again.
    expect(await routine.checkDue(later)).toBe(0);
  });

  it("shows the customer who moved it, on their side of the order", async () => {
    await webhook('order.posted', { status: 'posted', tracking: 'ME23002OWZ7BR' });
    const shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email: shopperEmail, password: PASSWORD })).json<AuthSession>();

    const theirs = (await call('GET', '/api/stores/lessari/customer/orders/1', shopper)).json<CustomerOrder>();
    expect(theirs).toMatchObject({ status: 'OUT_FOR_DELIVERY', delivery: { carrier: 'Correios', trackingCode: 'ME23002OWZ7BR' } });
  });
});
