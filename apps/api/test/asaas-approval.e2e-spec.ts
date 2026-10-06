// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AsaasAccountApproval, AsaasConnection, AuthSession, CustomerOrder, ProductDetail, StorefrontPaymentOptions } from '@harness-monorepo/contracts';

// App
import { AsaasClient, AsaasRefused, AsaasUnreachable } from '../src/modules/integrations/asaas/asaas.client.js';
import { AsaasWebhookKeeper } from '../src/modules/integrations/asaas/asaas-webhook-keeper.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakeAsaas } from './support/fake-asaas.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

/** Not a key of anyone: the fake Asaas takes whatever it is handed. */
const KEY = '$aact_hmlg_e2e-approval-key-0000000000000000000000';
const ONLINE = { online: { pix: true, card: true, maxInstallments: 1, minimumChargeCents: 500, minimumInstallmentCents: 500 }, offline: true };
const AS_BEFORE_ASAAS = { online: null, offline: true };
const DAY_MS = 86_400_000;

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

describe("a shop whose Asaas account is not approved (BEELINK-278)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let keeper: AsaasWebhookKeeper;
  let owner: AuthSession;
  let shopper: AuthSession;
  let blouse: string;
  const asaas = new FakeAsaas();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(AsaasClient).useValue(asaas));
    prisma = app.get(PrismaService);
    keeper = app.get(AsaasWebhookKeeper);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    asaas.reset();
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    blouse = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Blusa', priceCents: 5990 })).json<ProductDetail>().variants[0]!.id;

    const email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia Cliente', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    await call('PATCH', '/api/stores/lessari/customer/me', shopper, { phone: '(11) 98888-7777', cpf: '52998224725' });
  });

  function call(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  /** Connects with the account standing as `approved` at Asaas — an `Error` is Asaas not answering that. */
  async function connect(approved: AsaasAccountApproval | null | Error): Promise<AsaasConnection> {
    asaas.approved = approved;
    const response = await call('POST', '/api/stores/lessari/integrations/asaas', owner, { apiKey: KEY });
    expect(response.statusCode).toBe(200);
    return response.json<AsaasConnection>();
  }
  const panel = async () => (await call('GET', '/api/stores/lessari/integrations/asaas', owner)).json<AsaasConnection>();
  const recheck = (session: AuthSession = owner) => call('POST', '/api/stores/lessari/integrations/asaas/approval', session);
  const options = async () => (await call('GET', '/api/stores/lessari/payment-options')).json<StorefrontPaymentOptions>();
  const place = (body: object = {}) => call('POST', '/api/stores/lessari/customer/orders', shopper, { items: [{ variantId: blouse, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX', paymentChannel: 'ONLINE', ...body });

  it('connects, tells the panel which way the account stands, and charges nothing: the checkout and the placing of an order go by the one reading', async () => {
    for (const standing of ['AWAITING_APPROVAL', 'PENDING', 'REJECTED'] as const) {
      const connection = await connect(standing);

      expect(connection).toMatchObject({ status: 'CONNECTED', approval: standing, approvalCheckedAt: expect.any(String) });
      expect(await panel()).toMatchObject({ status: 'CONNECTED', approval: standing });
      expect(await options()).toEqual(AS_BEFORE_ASAAS);
      expect((await place()).json()).toMatchObject({ statusCode: 400, errorCode: 'ORDER_PAYMENT_NOT_ACCEPTED' });
    }
    // Nothing Asaas would refuse was asked of it.
    expect(asaas.calls).toEqual([]);

    // Meanwhile the shop sells as before: the order is settled with the customer.
    const offline = await place({ paymentChannel: 'OFFLINE' });
    expect(offline.statusCode).toBe(201);
    expect(offline.json<CustomerOrder>()).toMatchObject({ paymentChannel: 'OFFLINE', payment: null });
  });

  it('takes paying on delivery from an unapproved shop that had switched it off: it has no other way to be paid', async () => {
    await connect('AWAITING_APPROVAL');
    await call('PUT', '/api/stores/lessari/integrations/asaas/settings', owner, { pix: true, card: true, maxInstallments: 1, offline: false });

    expect(await options()).toEqual(AS_BEFORE_ASAAS);
    expect((await place({ paymentChannel: 'OFFLINE' })).statusCode).toBe(201);
  });

  it('charges an approved account, and one whose approval is not known: never read, unanswered, or said in a word not known', async () => {
    expect(await connect('APPROVED')).toMatchObject({ approval: 'APPROVED' });
    expect(await options()).toEqual(ONLINE);

    // Every shop connected before this was ever read.
    await prisma.storeIntegration.updateMany({ data: { accountApproval: null, accountApprovalCheckedAt: null } });
    expect(await panel()).toMatchObject({ approval: null, approvalCheckedAt: null });
    expect(await options()).toEqual(ONLINE);

    expect(await connect(new AsaasUnreachable('Asaas failed (503)'))).toMatchObject({ status: 'CONNECTED', approval: null, approvalCheckedAt: null });
    expect(await options()).toEqual(ONLINE);

    expect(await connect(null)).toMatchObject({ approval: null, approvalCheckedAt: expect.any(String) });
    expect(await options()).toEqual(ONLINE);
    expect((await place()).statusCode).toBe(201);
  });

  it('does not keep the last key\'s approval for a key that replaces it', async () => {
    await connect('REJECTED');

    expect(await connect(new AsaasUnreachable('Asaas failed (503)'))).toMatchObject({ approval: null });
    expect(await options()).toEqual(ONLINE);
  });

  describe('approved later', () => {
    it('is charged from the moment the shopkeeper asks again, with nothing reconnected', async () => {
      const { connectedAt } = await connect('AWAITING_APPROVAL');
      asaas.approved = 'APPROVED';

      const response = await recheck();

      expect(response.statusCode).toBe(200);
      expect(response.json<AsaasConnection>()).toMatchObject({ status: 'CONNECTED', approval: 'APPROVED', connectedAt });
      expect(await options()).toEqual(ONLINE);
      expect((await place()).json<CustomerOrder>()).toMatchObject({ paymentChannel: 'ONLINE', payment: { status: 'PENDING' } });
    });

    it('is charged from the daily look on, and an approval taken back stops it the same way', async () => {
      await connect('AWAITING_APPROVAL');
      asaas.approved = 'APPROVED';
      const tomorrow = new Date(Date.now() + DAY_MS);

      expect(await keeper.checkDue(tomorrow)).toBe(1);

      expect(await panel()).toMatchObject({ approval: 'APPROVED', approvalCheckedAt: tomorrow.toISOString() });
      expect(await options()).toEqual(ONLINE);

      asaas.approved = 'REJECTED';
      await keeper.checkDue(new Date(tomorrow.getTime() + DAY_MS + 1));
      expect(await panel()).toMatchObject({ approval: 'REJECTED' });
      expect(await options()).toEqual(AS_BEFORE_ASAAS);
    });

    it('keeps what was last read while Asaas does not answer — said to the shopkeeper who asked, silent on the daily look', async () => {
      await connect('AWAITING_APPROVAL');
      asaas.approved = new AsaasUnreachable('Asaas failed (503)');

      expect((await recheck()).json()).toMatchObject({ statusCode: 502, errorCode: 'INTEGRATION_UNREACHABLE' });
      await keeper.checkDue(new Date(Date.now() + DAY_MS));

      expect(await panel()).toMatchObject({ status: 'CONNECTED', approval: 'AWAITING_APPROVAL' });
      expect(await options()).toEqual(AS_BEFORE_ASAAS);
    });

    it('marks the connection to be reconnected when the asking finds the key refused', async () => {
      await connect('AWAITING_APPROVAL');
      asaas.keyError = new AsaasRefused(401, 'invalid_access_token', 'A chave de API fornecida é inválida');

      expect((await recheck()).json<AsaasConnection>()).toMatchObject({ status: 'NEEDS_RECONNECT' });
    });

    it('is asked by the shop\'s owner alone', async () => {
      await connect('AWAITING_APPROVAL');
      const stranger = await signUpAndSignIn(app, newEmail('outra'));
      const asked = asaas.approvalsAsked;

      expect((await recheck(stranger)).json()).toMatchObject({ statusCode: 403, errorCode: 'STORE_FORBIDDEN' });
      expect((await call('POST', '/api/stores/lessari/integrations/asaas/approval')).statusCode).toBe(401);
      expect(asaas.approvalsAsked).toBe(asked);
    });
  });

  it("learns of it from a charge Asaas refuses: a shop never read stops offering what its customer was just refused", async () => {
    // As production met it: connected before the approval was ever read, at an account still being looked at.
    await connect('AWAITING_APPROVAL');
    await prisma.storeIntegration.updateMany({ data: { accountApproval: null, accountApprovalCheckedAt: null } });
    expect(await options()).toEqual(ONLINE);

    // The order exists whatever Asaas does; its charge was refused.
    const order = await place();
    expect(order.statusCode).toBe(201);
    expect(order.json<CustomerOrder>()).toMatchObject({ paymentChannel: 'ONLINE', payment: { status: 'FAILED' } });
    expect(asaas.count('createCharge')).toBe(1);

    expect(await panel()).toMatchObject({ status: 'CONNECTED', approval: 'AWAITING_APPROVAL', approvalCheckedAt: expect.any(String) });
    expect(await options()).toEqual(AS_BEFORE_ASAAS);
    expect((await place()).json()).toMatchObject({ statusCode: 400, errorCode: 'ORDER_PAYMENT_NOT_ACCEPTED' });

    // The order already placed is not asked of Asaas again until the account is approved — and then is charged.
    expect((await call('POST', '/api/stores/lessari/customer/orders/1/payment', shopper)).json()).toMatchObject({ statusCode: 503, errorCode: 'PAYMENT_UNAVAILABLE' });
    expect(asaas.count('createCharge')).toBe(1);
    asaas.approved = 'APPROVED';
    await recheck();
    expect((await call('POST', '/api/stores/lessari/customer/orders/1/payment', shopper)).json()).toMatchObject({ payment: { status: 'PENDING' } });
  });

  it('leaves a shop approved when Asaas refuses a charge for some other reason', async () => {
    await connect('APPROVED');
    asaas.failing('createCharge', new AsaasRefused(400, 'invalid_value', 'O valor da cobrança é inválido.'));

    expect((await place()).statusCode).toBe(201);

    expect(await panel()).toMatchObject({ approval: 'APPROVED' });
    expect(await options()).toEqual(ONLINE);
  });
});
