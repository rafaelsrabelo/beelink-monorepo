// Nest
import { JwtService } from '@nestjs/jwt';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { CustomerCheckoutPhoneAnswer, CustomerOrder, CustomerPurchase, OrderQuote, PurchaseSession } from '@harness-monorepo/contracts';

// App
import { AsaasClient } from '../src/modules/integrations/asaas/asaas.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { createTestApp } from './support/create-test-app.js';
import { FakeAsaas } from './support/fake-asaas.js';
import { clearInbox } from './support/mailpit.js';
import { openOnlineShop, type OnlineShop } from './support/online-shop.js';
import { resetDatabase } from './support/reset-database.js';

/** Bia's WhatsApp as `openOnlineShop` keeps it on her record: "(11) 98888-7777". */
const BIA_PHONE = '(11) 98888-7777';

describe('a known WhatsApp goes on with a purchase session (plan 2026-11-06--whatsapp-primeiro)', () => {
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
    await clearInbox();
    shop = await openOnlineShop(app, prisma, 'lessari');
    // Bia's home, saved on her record.
    await shop.call('POST', '/api/stores/lessari/customer/addresses', shop.shopper, { label: 'Casa', zipCode: '60160-230', street: 'Rua Tibúrcio Cavalcante', number: '1200', neighborhood: 'Meireles', city: 'Fortaleza', state: 'CE' });
  });

  const byPhone = async (phone: string, slug = 'lessari') => (await app.inject({ method: 'POST', url: `/api/stores/${slug}/customer/checkout/phone`, payload: { phone } })).json<CustomerCheckoutPhoneAnswer>();
  const purchaseFor = async (phone = BIA_PHONE): Promise<PurchaseSession> => {
    const answer = await byPhone(phone);
    if (answer.kind !== 'RECOGNIZED') throw new Error('expected the number to be known');
    return answer.purchase;
  };
  const as = (purchase: PurchaseSession, method: 'GET' | 'POST', url: string, payload?: object) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${purchase.accessToken}` }, ...(payload ? { payload } : {}) });
  const pickup = () => ({ items: [{ variantId: shop.variantId, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX', paymentChannel: 'OFFLINE' });

  it('recognises a number of one of the shop’s records, any way it is written, and says a new one is new', async () => {
    const known = await byPhone('11 98888 7777');
    expect(known.kind).toBe('RECOGNIZED');
    if (known.kind === 'RECOGNIZED') expect(new Date(known.purchase.accessTokenExpiresAt).getTime() - Date.now()).toBeGreaterThan(119 * 60_000);

    expect(await byPhone('(11) 97777-6666')).toEqual({ kind: 'NEW' });
    expect((await app.inject({ method: 'POST', url: '/api/stores/lessari/customer/checkout/phone', payload: { phone: '123' } })).statusCode).toBe(400);
  });

  it('reads the record’s addresses masked, and nothing else of the person', async () => {
    const response = await as(await purchaseFor(), 'GET', '/api/stores/lessari/customer/purchase');

    expect(response.statusCode).toBe(200);
    const purchase = response.json<CustomerPurchase>();
    expect(purchase.addresses).toEqual([{ id: expect.any(String), line: 'Rua Tib•••, 12•• — Fortaleza/CE', isDefault: true }]);
    const said = JSON.stringify(purchase);
    for (const secret of ['Bia', 'Tibúrcio', '1200', '60160', 'Meireles', '52998224725', '98888']) expect(said).not.toContain(secret);
  });

  it('is refused everywhere a purchase does not need, as if there were no token', async () => {
    const purchase = await purchaseFor();

    for (const [method, url] of [
      ['GET', '/api/stores/lessari/customer/me'],
      ['GET', '/api/stores/lessari/customer/orders'],
      ['GET', '/api/stores/lessari/customer/cashback'],
      ['GET', '/api/stores/lessari/customer/addresses'],
      ['GET', '/api/stores/lessari/customer/favorites'],
    ] as const) {
      const response = await as(purchase, method, url);
      expect(response.statusCode, url).toBe(401);
      expect(response.json(), url).toMatchObject({ errorCode: 'AUTH_UNAUTHENTICATED' });
    }
    // Nor does the account's own session read what only a purchase session reads.
    expect((await shop.call('GET', '/api/stores/lessari/customer/purchase', shop.shopper)).statusCode).toBe(401);
  });

  it('places the order on the record, reads it back — and only the orders it placed', async () => {
    const before = await shop.place({ paymentChannel: 'OFFLINE' });
    const purchase = await purchaseFor();

    const placed = await as(purchase, 'POST', '/api/stores/lessari/customer/orders', pickup());
    expect(placed.statusCode).toBe(201);
    const order = placed.json<CustomerOrder>();
    const row = await prisma.order.findFirstOrThrow({ where: { storeId: shop.storeId, number: order.number }, include: { customer: true, events: true } });
    expect(row.customer.phone).toBe('5511988887777');
    expect(row.purchaseSessionId).not.toBeNull();
    expect(row.events[0]).toMatchObject({ actor: 'CUSTOMER', userId: null });

    expect((await as(purchase, 'GET', `/api/stores/lessari/customer/orders/${order.number}`)).statusCode).toBe(200);
    // The order the account placed before is the record's, and not this purchase's.
    expect((await as(purchase, 'GET', `/api/stores/lessari/customer/orders/${before.number}`)).statusCode).toBe(404);
    // Another purchase session of the same number reads none of the first one's.
    expect((await as(await purchaseFor(), 'GET', `/api/stores/lessari/customer/orders/${order.number}`)).statusCode).toBe(404);
    // The account sees it among its own: it is on its record.
    expect((await shop.call('GET', `/api/stores/lessari/customer/orders/${order.number}`, shop.shopper)).statusCode).toBe(200);
  });

  it('delivers to an address the record has, never one of another record', async () => {
    const purchase = await purchaseFor();
    const [address] = (await as(purchase, 'GET', '/api/stores/lessari/customer/purchase')).json<CustomerPurchase>().addresses;

    const delivered = await as(purchase, 'POST', '/api/stores/lessari/customer/orders', { ...pickup(), fulfillment: 'DELIVERY', addressId: address!.id });
    expect(delivered.statusCode).toBe(201);
    // Read back masked as it was chosen: placing an order is no way to read the address whole.
    const order = delivered.json<CustomerOrder>();
    expect(order.deliveryAddress).toEqual({ recipientName: '', zipCode: null, street: 'Rua Tib•••', number: '12••', complement: null, neighborhood: null, city: 'Fortaleza', state: 'CE' });
    expect(JSON.stringify((await as(purchase, 'GET', `/api/stores/lessari/customer/orders/${order.number}`)).json())).not.toContain('Tibúrcio');
    // The shop's panel, and the account itself, read it whole.
    expect((await shop.panelOrder(order.number)).deliveryAddress).toMatchObject({ street: 'Rua Tibúrcio Cavalcante', number: '1200' });

    const stranger = await prisma.customer.create({ data: { storeId: shop.storeId, name: 'Outra', phone: '5511977776666', addresses: { create: { street: 'Rua B', number: '1', city: 'Recife', state: 'PE', zipCode: '50000000', isDefault: true } } }, include: { addresses: true } });
    const refused = await as(purchase, 'POST', '/api/stores/lessari/customer/orders', { ...pickup(), fulfillment: 'DELIVERY', addressId: stranger.addresses[0]!.id });
    expect(refused.statusCode).toBe(400);
    expect(refused.json()).toMatchObject({ errorCode: 'ORDER_ADDRESS_NOT_FOUND' });
  });

  it('spends none of the record’s cashback, and prices the cart without it', async () => {
    const purchase = await purchaseFor();

    const refused = await as(purchase, 'POST', '/api/stores/lessari/customer/orders', { ...pickup(), cashbackCents: 100 });
    expect(refused.statusCode).toBe(400);
    expect(refused.json()).toMatchObject({ errorCode: 'ORDER_CASHBACK_REFUSED' });

    const quote = (await as(purchase, 'POST', '/api/stores/lessari/customer/orders/quote', { items: [{ variantId: shop.variantId, quantity: 1 }], fulfillment: 'PICKUP', useCashback: true })).json<OrderQuote>();
    expect(quote.cashbackUse).toBeNull();
  });

  /** A charge in somebody's CPF never comes from whoever only typed their WhatsApp. */
  it('charges online with the CPF typed, never the record’s, and leaves the record’s alone', async () => {
    const purchase = await purchaseFor();
    const online = { ...pickup(), paymentChannel: 'ONLINE' };

    const missing = await as(purchase, 'POST', '/api/stores/lessari/customer/orders', online);
    expect(missing.statusCode).toBe(400);
    expect(missing.json()).toMatchObject({ errorCode: 'ORDER_PAYER_DOCUMENT_MISSING' });

    const placed = await as(purchase, 'POST', '/api/stores/lessari/customer/orders', { ...online, recipientDocument: '11144477735' });
    expect(placed.statusCode).toBe(201);
    const number = placed.json<CustomerOrder>().number;
    expect((await as(purchase, 'GET', `/api/stores/lessari/customer/orders/${number}/payment`)).statusCode).toBe(200);
    expect((await prisma.customer.findFirstOrThrow({ where: { storeId: shop.storeId, phone: '5511988887777' } })).cpf).toBe('52998224725');
  });

  it('is a stranger at another shop, and nothing once its two hours are over', async () => {
    const purchase = await purchaseFor();
    await openOnlineShop(app, prisma, 'outra');
    expect((await as(purchase, 'GET', '/api/stores/outra/customer/purchase')).statusCode).toBe(401);

    const record = await prisma.customer.findFirstOrThrow({ where: { storeId: shop.storeId, phone: '5511988887777' } });
    const expired = await app.get(JwtService).signAsync({ sub: record.id, pid: crypto.randomUUID(), store: shop.storeId, kind: 'purchase' }, { expiresIn: -10 });
    expect((await as({ accessToken: expired, accessTokenExpiresAt: '' }, 'GET', '/api/stores/lessari/customer/purchase')).statusCode).toBe(401);
  });
});
