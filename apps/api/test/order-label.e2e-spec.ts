// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, IntegrationAuthorization, OrderLabelOverview, ProductDetail } from '@harness-monorepo/contracts';

// App
import {
  MelhorEnvioClient,
  MelhorEnvioRefused,
  type MelhorEnvioCartRequest,
  type MelhorEnvioQuoteRequest,
  type MelhorEnvioQuotedService,
} from '../src/modules/integrations/melhor-envio/melhor-envio.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

const SEDEX: MelhorEnvioQuotedService = { serviceId: 2, service: 'SEDEX', company: 'Correios', priceCents: 2745, daysFrom: 2, daysTo: 3, packages: [{ weightGrams: 600, lengthMm: 260, widthMm: 200, heightMm: 80 }] };
const LABEL = '9b5c4ad3-6f0e-4b7a-9d4c-0d6a4b0c8f11';

/** Melhor Envio for a label: a wallet that holds `balance`, and every step answering as `refuse` and `cancellable` say. */
class FakeMelhorEnvio {
  balance = 10_000;
  cancellableNow = true;
  refuseGeneration = false;
  readonly calls: string[] = [];
  readonly carts: MelhorEnvioCartRequest[] = [];

  authorizationUrl(_config: unknown, state: string): string {
    return `https://sandbox.melhorenvio.test/oauth/authorize?state=${state}`;
  }

  async exchange() {
    return { accessToken: 'access-1', refreshToken: 'refresh-1', expiresInSeconds: 30 * 24 * 60 * 60 };
  }

  async account() {
    return { id: 'me-1', name: 'Loja Lessari', email: 'envios@lessari.com.br' };
  }

  async quote(_config: unknown, _token: string, request: MelhorEnvioQuoteRequest): Promise<MelhorEnvioQuotedService[]> {
    return !request.serviceIds || request.serviceIds.includes(2) ? [SEDEX] : [];
  }

  async balanceCents(): Promise<number> {
    return this.balance;
  }

  async addToCart(_config: unknown, _token: string, request: MelhorEnvioCartRequest) {
    this.calls.push('cart');
    this.carts.push(request);
    return { id: LABEL, protocol: 'ORD-202610020001', priceCents: 2745 };
  }

  async removeFromCart() {
    this.calls.push('remove');
  }

  async checkout() {
    this.calls.push('checkout');
    this.balance -= 2745;
  }

  async generate() {
    this.calls.push('generate');
    return this.refuseGeneration ? { generated: false, message: 'CEP de destino inválido para a transportadora' } : { generated: true, message: 'Envio gerado com sucesso' };
  }

  async print() {
    this.calls.push('print');
    return 'https://sandbox.melhorenvio.test/imprimir/ixQLaqqjmb2E';
  }

  async tracking() {
    return { status: 'released', trackingCode: 'ME23002OWZ7BR' };
  }

  async cancellable() {
    return this.cancellableNow;
  }

  async cancel() {
    this.calls.push('cancel');
    return true;
  }
}

function shopBody(slug: string) {
  return { name: 'Loja Lessari', slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const home = { zipCode: '30140-071', street: 'Rua da Bahia', number: '1148', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG' };
const box = { weightGrams: 650, lengthMm: 260, widthMm: 200, heightMm: 90 };

describe("an order's shipping label (BEELINK-187)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let shopper: AuthSession;
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
    Object.assign(melhorEnvio, { balance: 10_000, cancellableNow: true, refuseGeneration: false });
    melhorEnvio.calls.length = 0;
    melhorEnvio.carts.length = 0;

    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    await prisma.store.update({ where: { slug: 'lessari' }, data: { addressStreet: 'Rua Augusta', addressNumber: '1500', addressNeighborhood: 'Consolação' } });
    const blouse = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Blusa', priceCents: 5990, weightGrams: 300, lengthMm: 255, widthMm: 200, heightMm: 40 })).json<ProductDetail>().variants[0]!.id;
    const begun = await call('POST', '/api/stores/lessari/integrations/melhor-envio/authorize', owner);
    await call('POST', '/api/integrations/melhor-envio/callback', owner, { code: 'c1', state: new URL(begun.json<IntegrationAuthorization>().url).searchParams.get('state')! });
    await call('PUT', '/api/stores/lessari/delivery', owner, { pickupEnabled: true, ownDeliveryEnabled: false, bands: [], freeAboveCents: null, carriersEnabled: true });
    await call('PUT', '/api/stores/lessari/integrations/melhor-envio/settings', owner, { handlingDays: 1, serviceIds: [2], defaultPackage: null, senderDocument: '11.222.333/0001-81' });

    const email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia Cliente', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    await call('PATCH', '/api/stores/lessari/customer/me', shopper, { phone: '(11) 98888-7777', cpf: '529.982.247-25' });
    await call('POST', '/api/stores/lessari/customer/addresses', shopper, home);
    const placed = await call('POST', '/api/stores/lessari/customer/orders', shopper, { items: [{ variantId: blouse, quantity: 2 }], fulfillment: 'DELIVERY', paymentMethod: 'PIX', shipping: { kind: 'CARRIER', serviceId: 2 } });
    expect(placed.statusCode).toBe(201);
  });

  function call(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const label = '/api/stores/lessari/orders/1/label';
  const overview = async () => (await call('GET', label, owner)).json<OrderLabelOverview>();
  const buy = (body: object = { volume: box }) => call('POST', label, owner, body);

  it('says the order can have a label, with the carrier, the wallet and the box Melhor Envio would pack it in', async () => {
    expect(await overview()).toEqual({
      label: null,
      blockers: [],
      carrier: { serviceId: 2, service: 'SEDEX', company: 'Correios' },
      suggestedVolume: { weightGrams: 600, lengthMm: 260, widthMm: 200, heightMm: 80 },
      balanceCents: 10_000,
      walletUrl: 'https://sandbox.melhorenvio.com.br',
    });
  });

  it('buys the label in one press — cart, payment, generation — and puts its tracking on the order', async () => {
    const response = await buy();

    expect(response.statusCode).toBe(200);
    expect(response.json<OrderLabelOverview>()).toMatchObject({ label: { status: 'GENERATED', protocol: 'ORD-202610020001', priceCents: 2745, volume: box, invoiceKey: null, trackingCode: 'ME23002OWZ7BR' }, balanceCents: 7255 });
    expect(melhorEnvio.calls).toEqual(['cart', 'checkout', 'generate']);
    expect(melhorEnvio.carts[0]).toMatchObject({
      serviceId: 2,
      from: { name: 'Loja Lessari', document: '11222333000181', email: 'envios@lessari.com.br', street: 'Rua Augusta', number: '1500', district: 'Consolação', zipCode: '01310930' },
      to: { name: 'Bia Cliente', document: '52998224725', street: 'Rua da Bahia', number: '1148', district: 'Centro', zipCode: '30140071' },
      products: [{ name: 'Blusa', quantity: 2, unitReais: 59.9 }],
      volume: { lengthCm: 26, widthCm: 20, heightCm: 9, weightKg: 0.65 },
      invoiceKey: null,
      tag: '#1',
    });
    expect((await prisma.orderDelivery.findFirstOrThrow()).trackingCode).toBe('ME23002OWZ7BR');
  });

  it('sends the invoice on a commercial shipment', async () => {
    await buy({ volume: box, invoiceKey: '3516 0912 3456 7800 0123 5500 1000 0012 3410 0001 2345'.replace(/ /g, '').padEnd(44, '0').slice(0, 44) });

    expect(melhorEnvio.carts[0]?.invoiceKey).toMatch(/^\d{44}$/);
  });

  it('says the wallet is short and by how much, keeps the label in the cart, and pays it on the next press without a second one', async () => {
    melhorEnvio.balance = 1000;

    expect((await buy()).json()).toMatchObject({ statusCode: 409, errorCode: 'LABEL_BALANCE_INSUFFICIENT', details: { balanceCents: 1000, priceCents: 2745, walletUrl: 'https://sandbox.melhorenvio.com.br' } });
    expect((await overview()).label).toMatchObject({ status: 'IN_CART' });

    melhorEnvio.balance = 5000;
    expect((await buy()).json<OrderLabelOverview>().label).toMatchObject({ status: 'GENERATED' });
    expect(melhorEnvio.calls).toEqual(['cart', 'checkout', 'generate']);
  });

  it('keeps a paid label Melhor Envio would not generate, says why, and generates it on the next press', async () => {
    melhorEnvio.refuseGeneration = true;

    expect((await buy()).json()).toMatchObject({ statusCode: 409, errorCode: 'LABEL_REFUSED', details: { reason: 'CEP de destino inválido para a transportadora' } });
    expect((await overview()).label).toMatchObject({ status: 'PAID' });

    melhorEnvio.refuseGeneration = false;
    expect((await buy()).json<OrderLabelOverview>().label).toMatchObject({ status: 'GENERATED' });
    expect(melhorEnvio.calls).toEqual(['cart', 'checkout', 'generate', 'generate']);
  });

  it("says Melhor Envio's own words when it refuses the cart", async () => {
    melhorEnvio.addToCart = async () => {
      throw new MelhorEnvioRefused(422, 'O campo to.document é obrigatório.');
    };
    expect((await buy()).json()).toMatchObject({ statusCode: 409, errorCode: 'LABEL_REFUSED', details: { reason: 'O campo to.document é obrigatório.' } });
    melhorEnvio.addToCart = FakeMelhorEnvio.prototype.addToCart.bind(melhorEnvio);
  });

  it('prints the generated label at a public address, and refuses to print one not generated', async () => {
    expect((await call('POST', `${label}/print`, owner)).json()).toMatchObject({ statusCode: 404, errorCode: 'LABEL_NOT_FOUND' });

    await buy();
    expect((await call('POST', `${label}/print`, owner)).json()).toEqual({ url: 'https://sandbox.melhorenvio.test/imprimir/ixQLaqqjmb2E' });
  });

  it('cancels while Melhor Envio allows it, taking the tracking it gave back off the order, and buys again after', async () => {
    await buy();

    const cancelled = await call('DELETE', label, owner);
    expect(cancelled.json<OrderLabelOverview>().label).toMatchObject({ status: 'CANCELLED', cancelledAt: expect.any(String) });
    expect((await prisma.orderDelivery.findFirstOrThrow()).trackingCode).toBeNull();

    expect((await buy()).json<OrderLabelOverview>().label).toMatchObject({ status: 'GENERATED', cancelledAt: null });
  });

  it('refuses to cancel once Melhor Envio no longer allows it, and takes a label still in the cart out of it', async () => {
    await buy();
    melhorEnvio.cancellableNow = false;
    expect((await call('DELETE', label, owner)).json()).toMatchObject({ statusCode: 409, errorCode: 'LABEL_NOT_CANCELLABLE' });

    await prisma.orderLabel.deleteMany();
    melhorEnvio.balance = 0;
    await buy();
    expect((await call('DELETE', label, owner)).json<OrderLabelOverview>().label).toBeNull();
    expect(melhorEnvio.calls.at(-1)).toBe('remove');
  });

  it('says what stands in the way, and buys nothing while it does', async () => {
    await call('PUT', '/api/stores/lessari/integrations/melhor-envio/settings', owner, { handlingDays: 1, serviceIds: [2], defaultPackage: null, senderDocument: null });
    await prisma.order.updateMany({ data: { deliveryDocument: null } });

    expect((await overview()).blockers).toEqual(['NO_SENDER_DOCUMENT', 'NO_RECIPIENT_DOCUMENT']);
    expect((await buy()).json()).toMatchObject({ statusCode: 409, errorCode: 'LABEL_NOT_AVAILABLE', details: { blockers: ['NO_SENDER_DOCUMENT', 'NO_RECIPIENT_DOCUMENT'] } });
    expect(melhorEnvio.calls).toEqual([]);
  });

  it('refuses a box past the carriers and an invoice key that is not 44 digits', async () => {
    expect((await buy({ volume: { ...box, weightGrams: 30_001 } })).json()).toMatchObject({ statusCode: 400, errorCode: 'LABEL_INVALID' });
    expect((await buy({ volume: box, invoiceKey: '123' })).json()).toMatchObject({ statusCode: 400, errorCode: 'LABEL_INVALID' });
  });

  it("refuses a carrier's order from a customer with no CPF, and keeps the CPF on the order it places", async () => {
    expect((await prisma.order.findFirstOrThrow()).deliveryDocument).toBe('52998224725');

    await prisma.customer.updateMany({ data: { cpf: null } });
    const variantId = (await prisma.productVariant.findFirstOrThrow()).id;
    const refused = await call('POST', '/api/stores/lessari/customer/orders', shopper, { items: [{ variantId, quantity: 1 }], fulfillment: 'DELIVERY', paymentMethod: 'PIX', shipping: { kind: 'CARRIER', serviceId: 2 } });
    expect(refused.json()).toMatchObject({ statusCode: 400, errorCode: 'ORDER_RECIPIENT_DOCUMENT_MISSING' });
  });

  it('keeps the sender saved when the settings are saved without it, and refuses one that is no CPF or CNPJ', async () => {
    await call('PUT', '/api/stores/lessari/integrations/melhor-envio/settings', owner, { handlingDays: 2, serviceIds: [2], defaultPackage: null });
    expect((await call('GET', '/api/stores/lessari/integrations/melhor-envio/settings', owner)).json()).toMatchObject({ handlingDays: 2, senderDocument: '11222333000181' });

    const wrong = await call('PUT', '/api/stores/lessari/integrations/melhor-envio/settings', owner, { handlingDays: 1, serviceIds: [2], defaultPackage: null, senderDocument: '11.222.333/0001-82' });
    expect(wrong.json()).toMatchObject({ statusCode: 400, errorCode: 'MELHOR_ENVIO_SETTINGS_INVALID' });
  });
});
