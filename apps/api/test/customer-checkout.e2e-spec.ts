// Nest
import { JwtService } from '@nestjs/jwt';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { CustomerCheckoutAnswer, CustomerOrder, CustomerPurchase, OrderQuote, PurchaseSession } from '@harness-monorepo/contracts';

// App
import { AsaasClient } from '../src/modules/integrations/asaas/asaas.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakeAsaas } from './support/fake-asaas.js';
import { clearInbox } from './support/mailpit.js';
import { openOnlineShop, type OnlineShop } from './support/online-shop.js';
import { resetDatabase } from './support/reset-database.js';

const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';
const inboxOf = async (email: string) => ((await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json()) as { messages: unknown[] }).messages;

/** A place to deliver to, as a visitor types it at the checkout. */
const HOME = { zipCode: '60160-230', street: 'Rua Tibúrcio Cavalcante', number: '1200', neighborhood: 'Meireles', city: 'Fortaleza', state: 'ce' };

describe('P0 — a visitor buys with no code and no account (plan 2026-11-06--P0-checkout-sem-codigo)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let shop: OnlineShop;
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
    shop = await openOnlineShop(app, prisma, 'lessari');
    await clearInbox();
  });

  const identify = (payload: object, slug = 'lessari') => app.inject({ method: 'POST', url: `/api/stores/${slug}/customer/checkout`, payload });
  const sessionFor = async (payload: { name: string; email: string; phone: string }, slug = 'lessari'): Promise<PurchaseSession> => {
    const response = await identify(payload, slug);
    expect(response.statusCode).toBe(200);
    return response.json<CustomerCheckoutAnswer>().purchase;
  };
  const as = (purchase: PurchaseSession, method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${purchase.accessToken}` }, ...(payload ? { payload } : {}) });
  const order = (extra: object = {}) => ({ items: [{ variantId: shop.variantId, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX', paymentChannel: 'OFFLINE', ...extra });

  it('lets a new customer buy with no code, no password and no account', async () => {
    const email = newEmail('nova');
    const purchase = await sessionFor({ name: 'Ana Souza', email, phone: '(11) 97777-6666' });

    const placed = await as(purchase, 'POST', '/api/stores/lessari/customer/orders', order());
    expect(placed.statusCode).toBe(201);

    expect(await prisma.user.count({ where: { email } })).toBe(0);
    const row = await prisma.order.findFirstOrThrow({ where: { storeId: shop.storeId, number: placed.json<CustomerOrder>().number }, include: { customer: true } });
    expect(row).toMatchObject({ contactEmail: email, customer: { name: 'Ana Souza', phone: '5511977776666', userId: null } });
    expect(await inboxOf(email)).toEqual([]);
  });

  /** "Having someone's e-mail is no authorisation to their account." */
  it('lets an e-mail that has an account buy the same way — no code sent, the account not signed in, nothing of it read', async () => {
    const email = newEmail('cadastrada');
    expect((await app.inject({ method: 'POST', url: '/api/stores/lessari/customer/register', payload: { name: 'Dona da Conta', email, password: PASSWORD } })).statusCode).toBe(202);
    await clearInbox();

    const fresh = (await identify({ name: 'Ana', email: newEmail('outra'), phone: '(11) 97777-6666' })).json<CustomerCheckoutAnswer>();
    const answer = (await identify({ name: 'Ana', email, phone: '(11) 96666-5555' })).json<CustomerCheckoutAnswer>();
    // The same answer, key for key: nothing tells a registered e-mail from a new one.
    expect(Object.keys(answer)).toEqual(Object.keys(fresh));
    expect(Object.keys(answer.purchase).sort()).toEqual(Object.keys(fresh.purchase).sort());

    expect((await as(answer.purchase, 'POST', '/api/stores/lessari/customer/orders', order())).statusCode).toBe(201);
    expect(await inboxOf(email)).toEqual([]);
    expect((await as(answer.purchase, 'GET', '/api/stores/lessari/customer/me')).statusCode).toBe(401);
  });

  it('places the order on the record of the phone and reads nothing of it — not its name, addresses, orders, CPF or credit', async () => {
    // Bia's record has her account, her CPF, an address and an order.
    await shop.call('POST', '/api/stores/lessari/customer/addresses', shop.shopper, { ...HOME, label: 'Casa' });
    const hers = await shop.place({ paymentChannel: 'OFFLINE' });
    const purchase = await sessionFor({ name: 'Quem Digitou', email: newEmail('x'), phone: '(11) 98888-7777' });

    for (const url of ['/api/stores/lessari/customer/me', '/api/stores/lessari/customer/orders', '/api/stores/lessari/customer/cashback', '/api/stores/lessari/customer/addresses', '/api/stores/lessari/customer/favorites']) {
      const refused = await as(purchase, 'GET', url);
      expect(refused.statusCode, url).toBe(401);
    }
    expect((await as(purchase, 'GET', `/api/stores/lessari/customer/orders/${hers.number}`)).statusCode).toBe(404);
    const self = (await as(purchase, 'GET', '/api/stores/lessari/customer/purchase')).json<CustomerPurchase>();
    expect(self).toMatchObject({ name: 'Quem Digitou', phone: '5511988887777', address: null });
    const quote = (await as(purchase, 'POST', '/api/stores/lessari/customer/orders/quote', { items: [{ variantId: shop.variantId, quantity: 1 }], fulfillment: 'PICKUP', useCashback: true })).json<OrderQuote>();
    expect(quote.cashbackUse).toBeNull();

    const placed = (await as(purchase, 'POST', '/api/stores/lessari/customer/orders', order())).json<CustomerOrder>();
    const record = await prisma.customer.findFirstOrThrow({ where: { storeId: shop.storeId, phone: '5511988887777' }, include: { addresses: true } });
    expect((await prisma.order.findFirstOrThrow({ where: { storeId: shop.storeId, number: placed.number } })).customerId).toBe(record.id);
    // Nothing of the record changed: its name, its one address.
    expect(record.name).toBe('Bia Cliente');
    expect(record.addresses).toHaveLength(1);
  });

  it('delivers to the address the visitor typed, kept through a reload, priced and written on the order — never on a record', async () => {
    const purchase = await sessionFor({ name: 'Ana Souza', email: newEmail('entrega'), phone: '(11) 97777-6666' });
    const missing = await as(purchase, 'POST', '/api/stores/lessari/customer/orders', order({ fulfillment: 'DELIVERY' }));
    expect(missing.json()).toMatchObject({ errorCode: 'ORDER_DELIVERY_ADDRESS_MISSING' });

    expect((await as(purchase, 'PUT', '/api/stores/lessari/customer/purchase/address', HOME)).statusCode).toBe(200);
    // A reload reads it back.
    expect((await as(purchase, 'GET', '/api/stores/lessari/customer/purchase')).json<CustomerPurchase>().address).toMatchObject({ street: 'Rua Tibúrcio Cavalcante', state: 'CE' });

    const placed = await as(purchase, 'POST', '/api/stores/lessari/customer/orders', order({ fulfillment: 'DELIVERY', deliveryFeeCents: null }));
    expect(placed.statusCode).toBe(201);
    expect(placed.json<CustomerOrder>().deliveryAddress).toMatchObject({ recipientName: 'Ana Souza', street: 'Rua Tibúrcio Cavalcante', number: '1200', city: 'Fortaleza' });
    const record = await prisma.customer.findFirstOrThrow({ where: { storeId: shop.storeId, phone: '5511977776666' }, include: { addresses: true } });
    expect(record.addresses).toEqual([]);
  });

  /** Pix and card, by the visitor's session: the CPF the gateway needs is typed, never another person's. */
  it.each(['PIX', 'CREDIT_CARD'] as const)('charges %s online with the CPF typed, and reads that payment alone', async (method) => {
    const purchase = await sessionFor({ name: 'Ana Souza', email: newEmail('online'), phone: '(11) 98888-7777' });
    const online = order({ paymentMethod: method, paymentChannel: 'ONLINE' });

    expect((await as(purchase, 'POST', '/api/stores/lessari/customer/orders', online)).json()).toMatchObject({ errorCode: 'ORDER_PAYER_DOCUMENT_MISSING' });
    const placed = await as(purchase, 'POST', '/api/stores/lessari/customer/orders', { ...online, recipientDocument: '11144477735' });
    expect(placed.statusCode).toBe(201);
    const number = placed.json<CustomerOrder>().number;
    expect((await as(purchase, 'GET', `/api/stores/lessari/customer/orders/${number}/payment`)).statusCode).toBe(200);
    // Bia's own CPF, on the record of that phone, was neither used nor replaced.
    expect((await prisma.customer.findFirstOrThrow({ where: { storeId: shop.storeId, phone: '5511988887777' } })).cpf).toBe('52998224725');
  });

  it("reads the orders it placed and no other session's, spends no credit, and stops at once when ended", async () => {
    const first = await sessionFor({ name: 'Ana', email: newEmail('a'), phone: '(11) 97777-6666' });
    const placed = (await as(first, 'POST', '/api/stores/lessari/customer/orders', order())).json<CustomerOrder>();
    const second = await sessionFor({ name: 'Ana', email: newEmail('a'), phone: '(11) 97777-6666' });

    expect((await as(first, 'GET', `/api/stores/lessari/customer/orders/${placed.number}`)).statusCode).toBe(200);
    expect((await as(second, 'GET', `/api/stores/lessari/customer/orders/${placed.number}`)).statusCode).toBe(404);
    expect((await as(first, 'POST', '/api/stores/lessari/customer/orders', order({ cashbackCents: 100 }))).json()).toMatchObject({ errorCode: 'ORDER_CASHBACK_REFUSED' });

    expect((await as(first, 'DELETE', '/api/stores/lessari/customer/purchase')).statusCode).toBe(204);
    expect((await as(first, 'GET', '/api/stores/lessari/customer/purchase')).statusCode).toBe(401);
  });

  /** White-label: one shop's visitor is a stranger at another, and a session past its days is nobody. */
  it('is a stranger at another shop, and nothing once expired', async () => {
    await openOnlineShop(app, prisma, 'outra');
    const purchase = await sessionFor({ name: 'Ana', email: newEmail('b'), phone: '(11) 97777-6666' });
    expect((await as(purchase, 'GET', '/api/stores/outra/customer/purchase')).statusCode).toBe(401);
    expect((await sessionFor({ name: 'Ana', email: newEmail('b'), phone: '(11) 97777-6666' }, 'outra')).accessToken).toBeTruthy();

    const row = await prisma.purchaseSession.findFirstOrThrow({ where: { storeId: shop.storeId } });
    await prisma.purchaseSession.update({ where: { id: row.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await as(purchase, 'GET', '/api/stores/lessari/customer/purchase')).statusCode).toBe(401);
    const forged = await app.get(JwtService).signAsync({ sub: row.id, store: shop.storeId, kind: 'purchase' }, { expiresIn: -10 });
    expect((await as({ accessToken: forged, accessTokenExpiresAt: '' }, 'GET', '/api/stores/lessari/customer/purchase')).statusCode).toBe(401);
  });

  it('refuses a name, an e-mail or a WhatsApp that is not one', async () => {
    for (const payload of [
      { name: 'A', email: newEmail('x'), phone: '11987654321' },
      { name: 'Ana', email: 'nao-e-email', phone: '11987654321' },
      { name: 'Ana', email: newEmail('x'), phone: '1234' },
    ]) {
      expect((await identify(payload)).statusCode).toBe(400);
    }
  });
});
