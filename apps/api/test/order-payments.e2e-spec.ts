// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AsaasConnection, AuthSession, CustomerOrder, CustomerOrderPage, CustomerOrderPaymentAnswer, Order, OrderPage, ProductDetail, StorefrontPaymentOptions } from '@harness-monorepo/contracts';

// App
import { AsaasClient, AsaasOutcomeUnknown, AsaasRefused, AsaasUnreachable } from '../src/modules/integrations/asaas/asaas.client.js';
import { brasiliaDayOf, endOfBrasiliaDay } from '../src/modules/payments/payment-terms.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { afterwards, FakeAsaas } from './support/fake-asaas.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

/** Not a key of anyone: the fake Asaas takes whatever it is handed. */
const KEY = '$aact_hmlg_e2e-order-payments-key-0000000000000000';
const CPF = '52998224725';
const DAY_MS = 86_400_000;

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const home = { zipCode: '30140-071', street: 'Rua da Bahia', number: '1148', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG' };
/** The shop's own delivery with no band: its fee is agreed after the order. */
const feeAgreedLater = { pickupEnabled: true, ownDeliveryEnabled: true, bands: [], freeAboveCents: null, carriersEnabled: false };
const dayIn = (days: number) => brasiliaDayOf(new Date(Date.now() + days * DAY_MS));

describe("an order's charge at the shop's own Asaas account (BEELINK-204)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let shopper: AuthSession;
  let blouse: string;
  let candy: string;
  const asaas = new FakeAsaas();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(AsaasClient).useValue(asaas));
    prisma = app.get(PrismaService);
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
    candy = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Bala', priceCents: 300 })).json<ProductDetail>().variants[0]!.id;
    await connect();
    await accept({ maxInstallments: 6 });

    shopper = await shopperOf('Bia Cliente');
    await call('PATCH', '/api/stores/lessari/customer/me', shopper, { phone: '(11) 98888-7777', cpf: CPF });
    await call('POST', '/api/stores/lessari/customer/addresses', shopper, home);
  });

  function call(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function shopperOf(name: string): Promise<AuthSession> {
    const email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name, email, password: PASSWORD });
    await verifyEmailOf(app, email);
    return (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
  }

  const connect = async () => expect((await call('POST', '/api/stores/lessari/integrations/asaas', owner, { apiKey: KEY })).json<AsaasConnection>().status).toBe('CONNECTED');
  const accept = (choices: object) => call('PUT', '/api/stores/lessari/integrations/asaas/settings', owner, { pix: true, card: true, maxInstallments: 1, offline: true, ...choices });
  const place = (body: object = {}, session: AuthSession = shopper) =>
    call('POST', '/api/stores/lessari/customer/orders', session, { items: [{ variantId: blouse, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX', paymentChannel: 'ONLINE', ...body });
  const placed = async (body: object = {}) => {
    const response = await place(body);
    expect(response.statusCode).toBe(201);
    return response.json<CustomerOrder>();
  };
  const payment = (number = 1) => `/api/stores/lessari/customer/orders/${number}/payment`;
  const charge = (number = 1, session: AuthSession = shopper) => call('POST', payment(number), session);
  const readPayment = async (number = 1) => (await call('GET', payment(number), shopper)).json<CustomerOrderPaymentAnswer>().payment;
  const panelOrder = async (number = 1) => (await call('GET', `/api/stores/lessari/orders/${number}`, owner)).json<Order>();
  const rows = () => prisma.orderPayment.findMany({ orderBy: { createdAt: 'asc' } });
  const orderId = async (number = 1) => (await prisma.order.findFirstOrThrow({ where: { number } })).id;
  /** The row as a webhook will leave it (BEELINK-206): nothing in this ticket marks a charge paid. */
  const markPaid = () => prisma.orderPayment.updateMany({ where: { status: 'PENDING' }, data: { status: 'CONFIRMED', paidAt: new Date() } });
  /** The charge past its day, here and at Asaas. */
  async function expire() {
    await prisma.orderPayment.updateMany({ where: { status: 'PENDING' }, data: { expiresAt: new Date(Date.now() - 1000) } });
    for (const standing of asaas.standing) standing.dueDate = dayIn(-1);
  }

  describe('placing an order paid online', () => {
    it('charges a Pix at the total the order wrote, due the next day in Brasília, for the customer found or registered by CPF', async () => {
      const order = await placed();

      expect(order).toMatchObject({
        paymentMethod: 'PIX',
        paymentChannel: 'ONLINE',
        installments: 1,
        totalCents: 5990,
        payment: { status: 'PENDING', method: 'PIX', installments: 1, amountCents: 5990, refundedCents: 0, expiresAt: endOfBrasiliaDay(dayIn(1)).toISOString(), paidAt: null },
      });
      expect(asaas.requests).toEqual([{ customerId: 'cus_1', billingType: 'PIX', totalCents: 5990, installments: 1, dueDate: dayIn(1), description: 'Pedido nº 1 — lessari', externalReference: await orderId() }]);
      expect(asaas.customers).toMatchObject([{ id: 'cus_1', name: 'Bia Cliente', cpf: CPF }]);
      // Asaas is asked what it already holds for the order before it is asked for a charge.
      expect(asaas.calls).toEqual(['charges', 'findCustomer', 'createCustomer', 'createCharge']);

      // The second order finds the customer kept: the account is not asked again.
      await placed();
      expect(asaas.count('findCustomer')).toBe(1);
      expect(asaas.count('createCustomer')).toBe(1);
      expect(asaas.requests[1]).toMatchObject({ customerId: 'cus_1' });
    });

    it('gives the Pix its code and QR on the read, asked of Asaas once and kept', async () => {
      await placed();
      expect(asaas.count('pixQrCode')).toBe(0);

      const first = await readPayment();
      expect(first).toMatchObject({ status: 'PENDING', method: 'PIX', invoiceUrl: null, pix: { payload: expect.stringContaining('br.gov.bcb.pix'), image: expect.any(String), expiresAt: endOfBrasiliaDay(dayIn(1)).toISOString() } });
      expect(await readPayment()).toEqual(first);
      expect(asaas.count('pixQrCode')).toBe(1);
    });

    it('offers a Pix only as long as its code lasts, when that ends before the due day', async () => {
      await placed();
      asaas.pixExpiresAt = endOfBrasiliaDay(dayIn(0));

      expect(await readPayment()).toMatchObject({ expiresAt: asaas.pixExpiresAt.toISOString(), pix: { expiresAt: asaas.pixExpiresAt.toISOString() } });
    });

    it('charges a card in instalments with the count and the total, due in three days, and sends the customer to the hosted invoice', async () => {
      const order = await placed({ paymentMethod: 'CREDIT_CARD', installments: 3 });

      expect(order).toMatchObject({ paymentMethod: 'CREDIT_CARD', paymentChannel: 'ONLINE', installments: 3, payment: { status: 'PENDING', method: 'CREDIT_CARD', installments: 3, amountCents: 5990, expiresAt: endOfBrasiliaDay(dayIn(3)).toISOString() } });
      expect(asaas.requests[0]).toMatchObject({ billingType: 'CREDIT_CARD', totalCents: 5990, installments: 3, dueDate: dayIn(3) });
      // One charge an instalment at Asaas, one row here: the first, and the plan it belongs to.
      expect(asaas.standing).toHaveLength(3);
      expect(await rows()).toMatchObject([{ providerId: asaas.standing[0]!.id, providerInstallmentId: asaas.standing[0]!.installmentId, amountCents: 5990 }]);
      expect(await readPayment()).toMatchObject({ pix: null, invoiceUrl: expect.stringMatching(/^https:\/\//) });
      expect(asaas.count('pixQrCode')).toBe(0);
    });

    it('still places the order when Asaas does not answer, without a charge — which its customer makes from it afterwards', async () => {
      asaas.failing('charges', new AsaasUnreachable('Asaas failed (503)'));

      expect(await placed()).toMatchObject({ number: 1, status: 'RECEIVED', paymentChannel: 'ONLINE', payment: null });
      expect(await readPayment()).toBeNull();

      const made = await charge();
      expect(made.statusCode).toBe(200);
      expect(made.json<CustomerOrderPaymentAnswer>().payment).toMatchObject({ status: 'PENDING', amountCents: 5990, pix: { payload: expect.any(String) } });
    });

    it('keeps what Asaas refused for the shop to read, in its words, and tells the customer a code and nothing more', async () => {
      asaas.failing('createCharge', new AsaasRefused(400, 'invalid_value', 'O valor da cobrança excede o limite da sua conta.'));

      expect(await placed()).toMatchObject({ payment: { status: 'FAILED', expiresAt: null } });
      expect((await panelOrder()).payment).toMatchObject({ status: 'FAILED', lastError: 'O valor da cobrança excede o limite da sua conta.' });

      asaas.failing('createCharge', new AsaasRefused(400, 'invalid_value', 'O valor da cobrança excede o limite da sua conta.'));
      const refused = await charge();
      expect(refused.json()).toMatchObject({ statusCode: 502, errorCode: 'PAYMENT_REFUSED' });
      expect(refused.payload).not.toContain('limite');
      expect(JSON.stringify(await readPayment())).not.toContain('limite');

      // Asaas takes it now: the refusals stay as history, and the order shows the charge that stands.
      expect((await charge()).json<CustomerOrderPaymentAnswer>().payment).toMatchObject({ status: 'PENDING' });
      expect((await rows()).map((row) => row.status)).toEqual(['FAILED', 'FAILED', 'PENDING']);
      expect((await panelOrder()).payment).toMatchObject({ status: 'PENDING', lastError: null });
    });

    it('charges nothing for an order whose delivery fee is not agreed, until the shop tells it', async () => {
      await call('PUT', '/api/stores/lessari/delivery', owner, feeAgreedLater);

      expect(await placed({ fulfillment: 'DELIVERY' })).toMatchObject({ paymentChannel: 'ONLINE', deliveryFeeCents: null, payment: null });
      expect(asaas.calls).toEqual([]);
      expect((await charge()).json()).toMatchObject({ statusCode: 409, errorCode: 'PAYMENT_AWAITING_TOTAL' });

      await call('PUT', '/api/stores/lessari/orders/1/delivery-fee', owner, { deliveryFeeCents: 1200 });
      expect((await charge()).json<CustomerOrderPaymentAnswer>().payment).toMatchObject({ status: 'PENDING', amountCents: 7190 });
      expect(asaas.requests[0]).toMatchObject({ totalCents: 7190 });
    });
  });

  describe("what the shop's checkout reads (BEELINK-205)", () => {
    const options = async (slug = 'lessari') => call('GET', `/api/stores/${slug}/payment-options`);

    it('tells anyone what the connected shop charges online, with the least amounts, and nothing of its account', async () => {
      const response = await options();

      expect(response.statusCode).toBe(200);
      expect(response.json<StorefrontPaymentOptions>()).toEqual({ online: { pix: true, card: true, maxInstallments: 6, minimumChargeCents: 500, minimumInstallmentCents: 500 }, offline: true });
      expect(response.body).not.toContain(KEY);
      expect(asaas.calls).toEqual([]);
    });

    it('follows what the shop chose: a way switched off, paying on delivery off, and nothing online with both ways off', async () => {
      await accept({ card: false, maxInstallments: 6, offline: false });
      expect((await options()).json<StorefrontPaymentOptions>()).toMatchObject({ online: { pix: true, card: false, maxInstallments: 1 }, offline: false });

      await accept({ pix: false, card: false, offline: true });
      expect((await options()).json<StorefrontPaymentOptions>()).toEqual({ online: null, offline: true });
    });

    it('is the checkout of before Asaas for a shop to be reconnected, disconnected, or never connected — whatever it had chosen', async () => {
      await accept({ offline: false });
      await prisma.storeIntegration.updateMany({ data: { status: 'NEEDS_RECONNECT' } });
      expect((await options()).json<StorefrontPaymentOptions>()).toEqual({ online: null, offline: true });

      await call('DELETE', '/api/stores/lessari/integrations/asaas', owner);
      expect((await options()).json<StorefrontPaymentOptions>()).toEqual({ online: null, offline: true });

      await call('POST', '/api/stores', owner, shopBody('outra'));
      expect((await options('outra')).json<StorefrontPaymentOptions>()).toEqual({ online: null, offline: true });
    });

    it('answers 404 for a shop that does not exist', async () => {
      expect((await options('nenhuma')).json()).toMatchObject({ statusCode: 404, errorCode: 'STORE_NOT_FOUND' });
    });
  });

  describe('what placing refuses', () => {
    const refusedWith = async (body: object, errorCode: string, statusCode = 400) => expect((await place(body)).json()).toMatchObject({ statusCode, errorCode });

    it('refuses online what Asaas does not charge, what the shop switched off, and more instalments than it offers', async () => {
      await refusedWith({ paymentMethod: 'MONEY' }, 'ORDER_PAYMENT_NOT_ACCEPTED');
      await refusedWith({ paymentMethod: 'DEBIT_CARD' }, 'ORDER_PAYMENT_NOT_ACCEPTED');
      await refusedWith({ paymentMethod: 'CREDIT_CARD', installments: 7 }, 'ORDER_PAYMENT_NOT_ACCEPTED');
      await refusedWith({ paymentMethod: 'PIX', installments: 2 }, 'ORDER_PAYMENT_NOT_ACCEPTED');
      await refusedWith({ paymentChannel: 'OFFLINE', installments: 2 }, 'ORDER_PAYMENT_NOT_ACCEPTED');
      await refusedWith({ paymentChannel: 'CASH' }, 'BAD_REQUEST');
      await refusedWith({ paymentMethod: 'CREDIT_CARD', installments: 13 }, 'BAD_REQUEST');

      await accept({ pix: false, maxInstallments: 6 });
      await refusedWith({ paymentMethod: 'PIX' }, 'ORDER_PAYMENT_NOT_ACCEPTED');
      await accept({ card: false });
      await refusedWith({ paymentMethod: 'CREDIT_CARD' }, 'ORDER_PAYMENT_NOT_ACCEPTED');

      expect(await prisma.order.count()).toBe(0);
      expect(asaas.calls).toEqual([]);
    });

    it('refuses online for a shop with no Asaas in good standing — never connected, or its key refused', async () => {
      await prisma.storeIntegration.updateMany({ data: { status: 'NEEDS_RECONNECT' } });
      await refusedWith({}, 'ORDER_PAYMENT_NOT_ACCEPTED');

      await call('DELETE', '/api/stores/lessari/integrations/asaas', owner);
      await refusedWith({}, 'ORDER_PAYMENT_NOT_ACCEPTED');
      expect(await prisma.order.count()).toBe(0);
    });

    it('refuses paying on delivery once the connected shop turned it off — and takes it again when the shop has no Asaas', async () => {
      await accept({ offline: false });
      await refusedWith({ paymentChannel: 'OFFLINE' }, 'ORDER_PAYMENT_NOT_ACCEPTED');
      // Absent is offline.
      await refusedWith({ paymentChannel: undefined }, 'ORDER_PAYMENT_NOT_ACCEPTED');

      // A key Asaas refuses leaves the shop selling as before Asaas, whatever it chose.
      await prisma.storeIntegration.updateMany({ data: { status: 'NEEDS_RECONNECT' } });
      expect((await place({ paymentChannel: 'OFFLINE' })).statusCode).toBe(201);
      await call('DELETE', '/api/stores/lessari/integrations/asaas', owner);
      expect((await place({ paymentChannel: undefined, paymentMethod: 'MONEY' })).json<CustomerOrder>()).toMatchObject({ paymentChannel: 'OFFLINE', installments: 1, payment: null });
    });

    it('takes an order with nothing left to pay as settled with the shop, even where paying on delivery is off — and only that one', async () => {
      await accept({ offline: false });
      const made = await call('POST', '/api/stores/lessari/coupons', owner, { code: 'TUDO', kind: 'FIXED', amountCents: 50000, startsAt: new Date(Date.now() - DAY_MS).toISOString() });
      expect(made.statusCode).toBe(201);

      // Nothing to charge: Asaas has a least amount, so online is refused and offline is the way.
      await refusedWith({ couponCode: 'TUDO' }, 'ORDER_PAYMENT_BELOW_MINIMUM', 409);
      const free = await place({ paymentChannel: 'OFFLINE', couponCode: 'TUDO' });
      expect(free.statusCode).toBe(201);
      expect(free.json<CustomerOrder>()).toMatchObject({ totalCents: 0, paymentChannel: 'OFFLINE', payment: null });
      expect(asaas.calls).toEqual([]);

      // With something to pay, and with a fee still to be agreed, offline stays refused there.
      await refusedWith({ paymentChannel: 'OFFLINE' }, 'ORDER_PAYMENT_NOT_ACCEPTED');
      await call('PUT', '/api/stores/lessari/delivery', owner, feeAgreedLater);
      await refusedWith({ paymentChannel: 'OFFLINE', couponCode: 'TUDO', fulfillment: 'DELIVERY' }, 'ORDER_PAYMENT_NOT_ACCEPTED');
      expect(await prisma.order.count()).toBe(1);
    });

    it("refuses online an order under Asaas's least charge, and a card split into instalments under its least", async () => {
      const small = await place({ items: [{ variantId: candy, quantity: 1 }] });
      expect(small.json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_PAYMENT_BELOW_MINIMUM', details: { minimumCents: 500, maxInstallments: 0 } });

      await accept({ maxInstallments: 12 });
      // R$ 59,90 in twelve is R$ 4,99 each.
      const thin = await place({ paymentMethod: 'CREDIT_CARD', installments: 12 });
      expect(thin.json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_PAYMENT_BELOW_MINIMUM', details: { minimumCents: 500, maxInstallments: 11 } });
      expect(await prisma.order.count()).toBe(0);
      // Refused inside the placement: the stock it took went back with it.
      expect((await place({ paymentMethod: 'CREDIT_CARD', installments: 11 })).statusCode).toBe(201);
      // Settled with the shop, a small order is as it always was.
      expect((await place({ items: [{ variantId: candy, quantity: 1 }], paymentChannel: 'OFFLINE' })).statusCode).toBe(201);
    });

    it('needs the CPF to charge online: the one on file, or the one typed at checkout, which is kept', async () => {
      await prisma.customer.updateMany({ data: { cpf: null } });

      await refusedWith({}, 'ORDER_PAYER_DOCUMENT_MISSING');
      await refusedWith({ recipientDocument: '111.111.111-11' }, 'CUSTOMER_CPF_INVALID');
      expect(await prisma.order.count()).toBe(0);

      expect((await place({ recipientDocument: '529.982.247-25' })).statusCode).toBe(201);
      expect((await prisma.customer.findFirstOrThrow()).cpf).toBe(CPF);
      expect(asaas.customers).toMatchObject([{ cpf: CPF }]);
      // Offline asks for none.
      await prisma.customer.updateMany({ data: { cpf: null } });
      expect((await place({ paymentChannel: 'OFFLINE' })).statusCode).toBe(201);
    });
  });

  describe("making sure of an order's charge", () => {
    it('answers the same charge while it serves, without asking Asaas for another', async () => {
      await placed();
      const calls = asaas.calls.length;

      const again = await charge();
      expect(again.statusCode).toBe(200);
      expect(again.json<CustomerOrderPaymentAnswer>().payment).toMatchObject({ status: 'PENDING', pix: { payload: expect.any(String) } });
      await charge();
      expect(asaas.count('createCharge')).toBe(1);
      // Nothing but the one read of the Pix code.
      expect(asaas.calls.slice(calls)).toEqual(['pixQrCode']);
      expect(await rows()).toHaveLength(1);
    });

    it('replaces a Pix past its day: the old one removed from Asaas first, then a new one made', async () => {
      await placed();
      const old = asaas.standing[0]!.id;
      await expire();
      expect(await readPayment()).toMatchObject({ status: 'PENDING', pix: null });
      asaas.calls.length = 0;

      const renewed = (await charge()).json<CustomerOrderPaymentAnswer>().payment!;
      expect(renewed).toMatchObject({ status: 'PENDING', expiresAt: endOfBrasiliaDay(dayIn(1)).toISOString(), pix: { payload: expect.stringContaining(asaas.standing[0]!.id) } });
      expect(asaas.calls).toEqual(['charges', 'deleteCharge', 'createCharge', 'pixQrCode']);
      expect(asaas.payment(old).deleted).toBe(true);
      expect(asaas.standing).toHaveLength(1);
      expect(await rows()).toMatchObject([{ providerId: old, status: 'CANCELLED', pixPayload: null }, { status: 'PENDING' }]);
    });

    it('removes the whole plan of a card past its day', async () => {
      await placed({ paymentMethod: 'CREDIT_CARD', installments: 3 });
      await expire();
      asaas.calls.length = 0;

      expect((await charge()).statusCode).toBe(200);
      expect(asaas.calls).toEqual(['charges', 'deleteInstallment', 'createCharge']);
      expect(asaas.payments.filter((made) => made.deleted)).toHaveLength(3);
      expect(asaas.standing).toHaveLength(3);
    });

    it('makes no second charge while Asaas will not remove the first', async () => {
      await placed();
      await expire();
      asaas.failing('deleteCharge', new AsaasRefused(400, 'invalid_action', 'Cobrança em processamento.'));

      expect((await charge()).json()).toMatchObject({ statusCode: 503, errorCode: 'PAYMENT_UNAVAILABLE' });
      expect(asaas.count('createCharge')).toBe(1);
      expect((await panelOrder()).payment).toMatchObject({ status: 'PENDING', lastError: 'Cobrança em processamento.' });
    });

    it('finds the old charge paid when Asaas refuses to remove it: the order is paid, and nothing new is made', async () => {
      await placed();
      await expire();
      asaas.pay(asaas.standing[0]!.id, 'RECEIVED');

      expect((await charge()).json()).toMatchObject({ statusCode: 409, errorCode: 'PAYMENT_ALREADY_PAID' });
      expect(asaas.count('createCharge')).toBe(1);
      expect(await rows()).toMatchObject([{ status: 'RECEIVED', providerStatus: 'RECEIVED', paidAt: expect.any(Date), pixPayload: null }]);
      expect((await call('GET', '/api/stores/lessari/customer/orders/1', shopper)).json<CustomerOrder>().payment).toMatchObject({ status: 'RECEIVED', paidAt: expect.any(String) });
      // And from the row alone the next time, with Asaas left in peace.
      asaas.calls.length = 0;
      expect((await charge()).json()).toMatchObject({ errorCode: 'PAYMENT_ALREADY_PAID' });
      expect(asaas.calls).toEqual([]);
    });

    it('does not take back a charge it had given up on, though it stands at Asaas again: it is removed and another made', async () => {
      await placed();
      const old = asaas.standing[0]!.id;
      // Restored in Asaas's panel, or never removed: cancelled here, waiting there.
      await prisma.orderPayment.updateMany({ data: { status: 'CANCELLED', cancelledAt: new Date() } });

      const made = (await charge()).json<CustomerOrderPaymentAnswer>().payment!;
      expect(made).toMatchObject({ status: 'PENDING', pix: { payload: expect.any(String) } });
      expect(asaas.payment(old).deleted).toBe(true);
      expect(asaas.standing).toHaveLength(1);
      expect((await rows()).map((row) => row.status)).toEqual(['CANCELLED', 'PENDING']);
    });

    it('never makes two charges for two requests at once: the second is told one is being made', async () => {
      asaas.failing('charges', new AsaasUnreachable('Asaas failed (503)'));
      await placed();
      let open!: () => void;
      const gate = new Promise<void>((resolve) => (open = resolve));
      asaas.before('charges', () => gate);

      const both = [charge(), charge()];
      const second = await Promise.race(both);
      expect(second.json()).toMatchObject({ statusCode: 409, errorCode: 'PAYMENT_IN_PROGRESS' });
      open();
      const answers = await Promise.all(both);

      expect(answers.map((answer) => answer.statusCode).sort()).toEqual([200, 409]);
      expect(asaas.count('createCharge')).toBe(1);
      expect(asaas.standing).toHaveLength(1);
      expect(await rows()).toHaveLength(1);
    });

    it('takes the charge a dead process left at Asaas instead of making another', async () => {
      // The charge was made and the process died before writing it: no row, and a claim nobody cleared.
      asaas.failing('createCharge', afterwards(new AsaasOutcomeUnknown('Asaas did not answer (TimeoutError)')));
      expect(await placed()).toMatchObject({ payment: null });
      expect(asaas.standing).toHaveLength(1);
      expect(await rows()).toHaveLength(0);

      // While the claim holds nobody creates: the charge may yet show at Asaas.
      expect((await charge()).json()).toMatchObject({ statusCode: 409, errorCode: 'PAYMENT_IN_PROGRESS' });
      expect(asaas.count('createCharge')).toBe(1);

      await prisma.order.updateMany({ data: { paymentClaimedUntil: new Date(Date.now() - 1000) } });
      const adopted = await charge();
      expect(adopted.json<CustomerOrderPaymentAnswer>().payment).toMatchObject({ status: 'PENDING', amountCents: 5990, pix: { payload: expect.stringContaining(asaas.standing[0]!.id) } });
      expect(asaas.count('createCharge')).toBe(1);
      expect(await rows()).toMatchObject([{ providerId: asaas.standing[0]!.id, status: 'PENDING' }]);
      expect((await prisma.order.findFirstOrThrow()).paymentClaimedUntil).toBeNull();
    });

    it('takes back the charge it has just made when the order was cancelled, or its total changed, while Asaas was being asked', async () => {
      asaas.failing('charges', new AsaasUnreachable('Asaas failed (503)'));
      await placed();
      asaas.failing('charges', new AsaasUnreachable('Asaas failed (503)'));
      await placed();

      asaas.before('createCharge', async () => void (await prisma.order.updateMany({ where: { number: 1 }, data: { status: 'CANCELLED' } })));
      expect((await charge(1)).json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_CANCELLED' });
      asaas.before('createCharge', async () => void (await prisma.order.updateMany({ where: { number: 2 }, data: { totalCents: 4990 } })));
      expect((await charge(2)).json()).toMatchObject({ statusCode: 409, errorCode: 'PAYMENT_IN_PROGRESS' });

      expect(asaas.count('createCharge')).toBe(2);
      expect(asaas.standing).toHaveLength(0);
      expect(await rows()).toHaveLength(0);
      // The order as it is now is charged on the next ask.
      asaas.before('createCharge', null);
      expect((await charge(2)).json<CustomerOrderPaymentAnswer>().payment).toMatchObject({ status: 'PENDING', amountCents: 4990 });
    });

    it("marks the connection as needing reconnection on Asaas's 401, and tells the customer no more than that the shop cannot be paid now", async () => {
      asaas.failing('charges', new AsaasRefused(401, 'invalid_access_token', 'A chave de API fornecida é inválida'));
      expect(await placed()).toMatchObject({ payment: null });

      expect((await prisma.storeIntegration.findFirstOrThrow()).status).toBe('NEEDS_RECONNECT');
      const answer = await charge();
      expect(answer.json()).toMatchObject({ statusCode: 503, errorCode: 'PAYMENT_UNAVAILABLE' });
      expect(answer.payload).not.toMatch(/chave|key|401|token/i);
      // The claim was let go: once reconnected, the charge is made at once.
      await connect();
      expect((await charge()).statusCode).toBe(200);
    });

    it('is not held back by a customer id from an account the shop left: the customer is looked for again', async () => {
      await placed();
      // Another account: it knows neither the customer nor the charge.
      asaas.customers.length = 0;
      asaas.payments.length = 0;
      await connect();

      const made = await charge();
      expect(made.statusCode).toBe(200);
      expect(asaas.customers).toHaveLength(1);
      expect(asaas.requests.at(-1)).toMatchObject({ customerId: asaas.customers[0]!.id });
      expect((await prisma.asaasCustomer.findFirstOrThrow()).providerId).toBe(asaas.customers[0]!.id);
      // The charge of the account left behind is no longer this order's.
      expect((await rows()).map((row) => row.status)).toEqual(['CANCELLED', 'PENDING']);
    });

    it('refuses, each with its own code, an order settled with the shop, a cancelled one, and one already paid', async () => {
      await placed({ paymentChannel: 'OFFLINE' });
      expect((await charge(1)).json()).toMatchObject({ statusCode: 409, errorCode: 'PAYMENT_NOT_ONLINE' });
      expect(await readPayment(1)).toBeNull();

      await placed();
      await call('POST', '/api/stores/lessari/customer/orders/2/cancel', shopper);
      expect((await charge(2)).json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_CANCELLED' });

      await placed();
      await markPaid();
      expect((await charge(3)).json()).toMatchObject({ statusCode: 409, errorCode: 'PAYMENT_ALREADY_PAID' });
    });

    it("finds nobody else's order, and is closed to who is not signed in as a shopper", async () => {
      await placed();
      const other = await shopperOf('Outra Cliente');

      expect((await call('GET', payment(), other)).json()).toMatchObject({ statusCode: 404, errorCode: 'ORDER_NOT_FOUND' });
      expect((await charge(1, other)).json()).toMatchObject({ statusCode: 404, errorCode: 'ORDER_NOT_FOUND' });
      expect((await charge(99)).json()).toMatchObject({ statusCode: 404, errorCode: 'ORDER_NOT_FOUND' });
      expect((await call('GET', payment())).statusCode).toBe(401);
      expect((await call('POST', payment())).statusCode).toBe(401);
      expect((await charge(1, owner)).statusCode).toBe(401);
      expect(asaas.count('createCharge')).toBe(1);
    });
  });

  describe('the rest of the order', () => {
    it("removes the waiting charge from Asaas when the customer cancels, and when the shop does", async () => {
      await placed();
      const cancelled = await call('POST', '/api/stores/lessari/customer/orders/1/cancel', shopper);
      expect(cancelled.json<CustomerOrder>()).toMatchObject({ status: 'CANCELLED', payment: { status: 'CANCELLED' } });
      expect(asaas.standing).toHaveLength(0);

      await placed({ paymentMethod: 'CREDIT_CARD', installments: 2 });
      expect(asaas.standing).toHaveLength(2);
      const byShop = await call('PATCH', '/api/stores/lessari/orders/2/status', owner, { status: 'CANCELLED' });
      expect(byShop.json<Order>()).toMatchObject({ status: 'CANCELLED' });
      expect(asaas.standing).toHaveLength(0);
      expect((await panelOrder(2)).payment).toMatchObject({ status: 'CANCELLED' });
    });

    it('removes, on a cancellation, a charge a dead process left at Asaas with no row here', async () => {
      asaas.failing('createCharge', afterwards(new AsaasOutcomeUnknown('Asaas did not answer (TimeoutError)')));
      await placed();
      expect(asaas.standing).toHaveLength(1);

      await call('POST', '/api/stores/lessari/customer/orders/1/cancel', shopper);
      expect(asaas.standing).toHaveLength(0);
    });

    it('cancels the order all the same when Asaas does not remove the charge, and keeps why for the shop', async () => {
      await placed();
      asaas.failing('deleteCharge', new AsaasUnreachable('Asaas failed (503)'));

      const cancelled = await call('POST', '/api/stores/lessari/customer/orders/1/cancel', shopper);
      expect(cancelled.statusCode).toBe(200);
      expect(cancelled.json<CustomerOrder>().status).toBe('CANCELLED');
      expect((await panelOrder()).payment).toMatchObject({ status: 'PENDING', lastError: 'Asaas failed (503)' });
    });

    it('stops offering the charge of a cancelled order, even one Asaas has not removed', async () => {
      await placed();
      expect(await readPayment()).toMatchObject({ pix: { payload: expect.any(String) } });
      asaas.failing('deleteCharge', new AsaasUnreachable('Asaas failed (503)'));
      await call('POST', '/api/stores/lessari/customer/orders/1/cancel', shopper);

      expect(await readPayment()).toMatchObject({ status: 'PENDING', pix: null, invoiceUrl: null });
    });

    it('asks Asaas before cancelling or changing the fee: a charge paid since is found, and the order stays as it is', async () => {
      await call('PUT', '/api/stores/lessari/delivery', owner, feeAgreedLater);
      await placed({ fulfillment: 'DELIVERY' });
      await call('PUT', '/api/stores/lessari/orders/1/delivery-fee', owner, { deliveryFeeCents: 1200 });
      await charge();
      // Paid at Asaas; nothing told bee-link.
      asaas.pay(asaas.standing[0]!.id, 'RECEIVED');
      expect(await rows()).toMatchObject([{ status: 'PENDING' }]);

      expect((await call('POST', '/api/stores/lessari/customer/orders/1/cancel', shopper)).json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_PAID' });
      expect(await rows()).toMatchObject([{ status: 'RECEIVED', paidAt: expect.any(Date) }]);
      expect(await panelOrder()).toMatchObject({ status: 'RECEIVED', payment: { status: 'RECEIVED' } });

      await placed();
      asaas.pay(asaas.standing.at(-1)!.id, 'CONFIRMED');
      expect((await call('PATCH', '/api/stores/lessari/orders/2/status', owner, { status: 'CANCELLED' })).json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_PAID' });

      await placed({ fulfillment: 'DELIVERY' });
      await call('PUT', '/api/stores/lessari/orders/3/delivery-fee', owner, { deliveryFeeCents: 1200 });
      await charge(3);
      asaas.pay(asaas.standing.at(-1)!.id, 'RECEIVED');
      expect((await call('PUT', '/api/stores/lessari/orders/3/delivery-fee', owner, { deliveryFeeCents: 0 })).json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_PAID' });
      expect(await panelOrder(3)).toMatchObject({ totalCents: 7190, payment: { status: 'RECEIVED' } });
    });

    it('cancels the order by what it knows when Asaas does not say whether it was paid', async () => {
      await placed();
      asaas.failing('charges', new AsaasUnreachable('Asaas failed (503)'));
      asaas.failing('charges', new AsaasUnreachable('Asaas failed (503)'));

      expect((await call('POST', '/api/stores/lessari/customer/orders/1/cancel', shopper)).json<CustomerOrder>().status).toBe('CANCELLED');
    });

    it('leaves alone a charge made while it was removing the old one: only what it saw at Asaas is given up on', async () => {
      await call('PUT', '/api/stores/lessari/delivery', owner, feeAgreedLater);
      await placed({ fulfillment: 'DELIVERY' });
      await call('PUT', '/api/stores/lessari/orders/1/delivery-fee', owner, { deliveryFeeCents: 1200 });
      await charge();
      // While the fee change removes the old charge, the customer's own request has already made the new one.
      asaas.before('deleteCharge', async () => {
        const old = await prisma.orderPayment.findFirstOrThrow();
        await prisma.orderPayment.update({ where: { id: old.id }, data: { status: 'CANCELLED' } });
        await prisma.orderPayment.create({ data: { orderId: old.orderId, storeId: old.storeId, providerId: 'pay_made_meanwhile', method: 'PIX', amountCents: 5990, status: 'PENDING' } });
      });

      await call('PUT', '/api/stores/lessari/orders/1/delivery-fee', owner, { deliveryFeeCents: 0 });
      expect(await prisma.orderPayment.findUniqueOrThrow({ where: { providerId: 'pay_made_meanwhile' } })).toMatchObject({ status: 'PENDING' });
    });

    it('asks Asaas nothing to cancel an order settled with the shop', async () => {
      await placed({ paymentChannel: 'OFFLINE' });
      expect((await call('POST', '/api/stores/lessari/customer/orders/1/cancel', shopper)).statusCode).toBe(200);
      expect(asaas.calls).toEqual([]);
    });

    it('does not cancel a paid order, from either side, nor change its delivery fee', async () => {
      await call('PUT', '/api/stores/lessari/delivery', owner, feeAgreedLater);
      await placed({ fulfillment: 'DELIVERY' });
      await call('PUT', '/api/stores/lessari/orders/1/delivery-fee', owner, { deliveryFeeCents: 1200 });
      await charge();
      await markPaid();

      expect((await call('POST', '/api/stores/lessari/customer/orders/1/cancel', shopper)).json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_PAID' });
      expect((await call('PATCH', '/api/stores/lessari/orders/1/status', owner, { status: 'CANCELLED' })).json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_PAID' });
      expect((await call('PUT', '/api/stores/lessari/orders/1/delivery-fee', owner, { deliveryFeeCents: 900 })).json()).toMatchObject({ statusCode: 409, errorCode: 'ORDER_PAID' });
      expect(await panelOrder()).toMatchObject({ status: 'RECEIVED', totalCents: 7190, payment: { status: 'CONFIRMED' } });
      expect(asaas.standing).toHaveLength(1);
      // Any other move is the shop's as before.
      expect((await call('PATCH', '/api/stores/lessari/orders/1/status', owner, { status: 'ACCEPTED' })).statusCode).toBe(200);
    });

    it('removes the waiting charge when the shop changes the fee, so the next is made at the new total', async () => {
      await call('PUT', '/api/stores/lessari/delivery', owner, feeAgreedLater);
      await placed({ fulfillment: 'DELIVERY', paymentMethod: 'CREDIT_CARD', installments: 6 });
      await call('PUT', '/api/stores/lessari/orders/1/delivery-fee', owner, { deliveryFeeCents: 1200 });
      await charge();
      expect(asaas.requests[0]).toMatchObject({ totalCents: 7190, installments: 6 });

      // The same fee told again leaves the charge as good as it was.
      await call('PUT', '/api/stores/lessari/orders/1/delivery-fee', owner, { deliveryFeeCents: 1200 });
      expect(asaas.standing).toHaveLength(6);

      const changed = await call('PUT', '/api/stores/lessari/orders/1/delivery-fee', owner, { deliveryFeeCents: 0 });
      expect(changed.json<Order>()).toMatchObject({ totalCents: 5990, payment: { status: 'CANCELLED' } });
      expect(asaas.standing).toHaveLength(0);

      await charge();
      expect(asaas.requests[1]).toMatchObject({ totalCents: 5990, installments: 6 });
      expect((await rows()).map((row) => [row.status, row.amountCents])).toEqual([['CANCELLED', 7190], ['PENDING', 5990]]);
    });

    it('shows the panel the payment on the order and the channel on the list, and the customer theirs', async () => {
      await placed({ paymentMethod: 'CREDIT_CARD', installments: 2 });
      await placed({ paymentChannel: 'OFFLINE' });

      expect(await panelOrder(1)).toMatchObject({ paymentChannel: 'ONLINE', installments: 2, payment: { status: 'PENDING', method: 'CREDIT_CARD', installments: 2, amountCents: 5990, providerStatus: 'PENDING', lastError: null } });
      expect(await panelOrder(2)).toMatchObject({ paymentChannel: 'OFFLINE', installments: 1, payment: null });
      const list = (await call('GET', '/api/stores/lessari/orders', owner)).json<OrderPage>().orders;
      expect(list).toMatchObject([{ number: 2, paymentChannel: 'OFFLINE', payment: null }, { number: 1, paymentChannel: 'ONLINE', payment: { status: 'PENDING', expiresAt: endOfBrasiliaDay(dayIn(3)).toISOString() } }]);
      const mine = (await call('GET', '/api/stores/lessari/customer/orders', shopper)).json<CustomerOrderPage>().orders;
      expect(mine).toMatchObject([{ number: 2, paymentChannel: 'OFFLINE', payment: null }, { number: 1, paymentChannel: 'ONLINE', payment: { status: 'PENDING' } }]);
    });

    it("answers the shop's key nowhere", async () => {
      await placed();
      const answers = [await charge(), await call('GET', payment(), shopper), await call('GET', '/api/stores/lessari/orders/1', owner), await call('GET', '/api/stores/lessari/customer/orders/1', shopper)];
      for (const answer of answers) expect(answer.payload).not.toContain('aact');
    });
  });
});
