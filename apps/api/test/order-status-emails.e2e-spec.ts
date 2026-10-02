// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import { vi } from 'vitest';

// Types
import type { AuthSession, CustomerNotifications, CustomerOrder, CustomerProfile, Order, Product, StoreCustomer } from '@harness-monorepo/contracts';

// App
import { OrderStatusMailer } from '../src/modules/orders/order-status-mailer.js';
import { MailService } from '../src/shared/mail/mail.service.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const paulista = { zipCode: '01310-930', street: 'Av. Paulista', number: '1000', city: 'São Paulo', state: 'SP' };

describe("a customer hears by e-mail when their order moves", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let shopper: AuthSession;
  let email: string;
  let whey: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await resetDatabase(prisma);
    await clearInbox();
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    const product = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Whey', priceCents: 8990 })).json<Product>();
    whey = (await prisma.productVariant.findFirstOrThrow({ where: { productId: product.id } })).id;

    email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    await call('POST', '/api/stores/lessari/customer/addresses', shopper, paulista);
    await clearInbox();
  });

  function call(method: 'GET' | 'POST' | 'PATCH' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function placeFromCart(fulfillment: 'DELIVERY' | 'PICKUP' = 'DELIVERY'): Promise<number> {
    const response = await call('POST', '/api/stores/lessari/customer/orders', shopper, { items: [{ variantId: whey, quantity: 1 }], fulfillment, paymentMethod: 'PIX' });
    if (response.statusCode !== 201) throw new Error(`POST customer/orders answered ${response.statusCode}: ${response.payload}`);
    return response.json<CustomerOrder>().number;
  }

  const move = (number: number, status: string) => call('PATCH', `/api/stores/lessari/orders/${number}/status`, owner, { status });
  const owed = () => prisma.orderStatusEmail.findMany({ orderBy: { createdAt: 'asc' } });

  it('tells each move — accepted, on its way, delivered — in the shop’s name, with the way to the order', async () => {
    const number = await placeFromCart();
    // Received is the customer's own doing: nothing owed.
    expect(await owed()).toEqual([]);

    expect((await move(number, 'ACCEPTED')).statusCode).toBe(200);
    const accepted = await waitForMessage(email, 10_000, 'confirmado');
    expect(accepted.Subject).toBe(`lessari — pedido nº ${number} confirmado`);
    expect(accepted.From).toMatchObject({ Name: 'lessari' });
    expect(accepted.Text).toContain(`Seu pedido nº ${number} em lessari foi confirmado.`);
    expect(accepted.Text).toContain(`http://localhost:3000/lessari/conta/pedidos/${number}`);
    // The way to stop these, straight to the box that does it.
    expect(accepted.Text).toContain('http://localhost:3000/lessari/conta/perfil#avisos');

    await move(number, 'PREPARING');
    await move(number, 'OUT_FOR_DELIVERY');
    expect((await waitForMessage(email, 10_000, 'saiu para entrega')).Subject).toBe(`lessari — pedido nº ${number} saiu para entrega`);
    await move(number, 'DELIVERED');
    expect((await waitForMessage(email, 10_000, 'entregue')).Subject).toBe(`lessari — pedido nº ${number} entregue`);

    // Preparing is the shop's own business; every owed one went.
    expect((await owed()).map(({ status, sentAt }) => [status, sentAt !== null])).toEqual([
      ['ACCEPTED', true],
      ['OUT_FOR_DELIVERY', true],
      ['DELIVERED', true],
    ]);
  });

  it('reads a pick-up as the shop window does, and a cancel by the shop is told, one by the customer not', async () => {
    const pickup = await placeFromCart('PICKUP');
    await move(pickup, 'OUT_FOR_DELIVERY');
    expect((await waitForMessage(email, 10_000, 'pronto para retirar')).Text).toContain('está pronto para retirar');
    await move(pickup, 'CANCELLED');
    expect((await waitForMessage(email, 10_000, 'cancelado')).Subject).toBe(`lessari — pedido nº ${pickup} cancelado`);

    const mine = await placeFromCart();
    expect((await call('POST', `/api/stores/lessari/customer/orders/${mine}/cancel`, shopper)).statusCode).toBe(200);
    expect((await owed()).filter(({ status }) => status === 'CANCELLED')).toHaveLength(1);
  });

  it('owes nothing to a customer with no account, nor to one who turned the notice off', async () => {
    const registered = (await call('POST', '/api/stores/lessari/customers', owner, { name: 'Caio', phone: '11955554444' })).json<StoreCustomer>();
    const sale = (await call('POST', '/api/stores/lessari/orders', owner, { customer: { id: registered.id }, items: [{ variantId: whey, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' })).json<Order>();
    await move(sale.number, 'DELIVERED');
    expect(await owed()).toEqual([]);

    const off = await call('PUT', '/api/stores/lessari/customer/me/notifications', shopper, { orders: false, favorites: true, cashback: true, offers: false });
    expect(off.json<CustomerNotifications>()).toEqual({ orders: false, favorites: true, cashback: true, offers: false, offersChosenAt: null });
    const number = await placeFromCart();
    await move(number, 'ACCEPTED');
    expect(await owed()).toEqual([]);
  });

  it('owes nothing to an account that never confirmed its e-mail: anyone can type someone else’s', async () => {
    const stranger = newEmail('nunca-confirmou');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Outra', email: stranger, password: PASSWORD });
    const record = await prisma.customer.findFirstOrThrow({ where: { user: { email: stranger } } });

    const sale = (await call('POST', '/api/stores/lessari/orders', owner, { customer: { id: record.id }, items: [{ variantId: whey, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' })).json<Order>();
    await move(sale.number, 'DELIVERED');

    expect(await owed()).toEqual([]);
  });

  it('drops a notice gone stale: a later move of the same order already told', async () => {
    const send = vi.spyOn(app.get(MailService), 'sendOrderStatus').mockResolvedValueOnce(false);
    const number = await placeFromCart();
    await move(number, 'ACCEPTED');
    await vi.waitFor(async () => expect((await owed())[0]).toMatchObject({ attempts: 1, sentAt: null }));

    await move(number, 'CANCELLED');
    await waitForMessage(email, 10_000, 'cancelado');
    // The failed "confirmado", due again, is marked done without going out after the cancel.
    await prisma.orderStatusEmail.updateMany({ where: { status: 'ACCEPTED' }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
    send.mockClear();
    await app.get(OrderStatusMailer).flush();

    expect(send).not.toHaveBeenCalled();
    expect((await owed()).map(({ status, sentAt }) => [status, sentAt !== null])).toEqual([
      ['ACCEPTED', true],
      ['CANCELLED', true],
    ]);
  });

  it("tells a sale the shop registers for a customer with an account: it is born accepted", async () => {
    const me = (await call('GET', '/api/stores/lessari/customer/me', shopper)).json<CustomerProfile>();
    const sale = (await call('POST', '/api/stores/lessari/orders', owner, { customer: { id: me.id }, items: [{ variantId: whey, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' })).json<Order>();

    expect((await waitForMessage(email, 10_000, 'confirmado')).Subject).toBe(`lessari — pedido nº ${sale.number} confirmado`);
  });

  it('never fails a move for the mail: an e-mail that did not go waits, and goes on a later sweep', async () => {
    const mail = app.get(MailService);
    vi.spyOn(mail, 'sendOrderStatus').mockResolvedValueOnce(false);
    const number = await placeFromCart();

    expect((await move(number, 'ACCEPTED')).statusCode).toBe(200);
    await vi.waitFor(async () => expect((await owed())[0]).toMatchObject({ attempts: 1, sentAt: null }));
    const [waiting] = await owed();
    expect(waiting!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());

    // Due again: the next sweep sends it, once.
    await prisma.orderStatusEmail.update({ where: { id: waiting!.id }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
    const mailer = app.get(OrderStatusMailer);
    const [first, second] = await Promise.all([mailer.flush(), mailer.flush()]);
    expect(first + second).toBe(1);
    expect((await waitForMessage(email, 10_000, 'confirmado')).Subject).toContain(`pedido nº ${number} confirmado`);
    expect((await owed())[0]).toMatchObject({ attempts: 2, sentAt: expect.any(Date) });
  });

  it('keeps the notices the shopper chooses, and when they said yes or no to offers', async () => {
    const start = (await call('GET', '/api/stores/lessari/customer/me', shopper)).json<CustomerProfile>();
    expect(start.notifications).toEqual({ orders: true, favorites: true, cashback: true, offers: false, offersChosenAt: null });

    const yes = (await call('PUT', '/api/stores/lessari/customer/me/notifications', shopper, { orders: true, favorites: false, cashback: true, offers: true })).json<CustomerNotifications>();
    expect(yes).toMatchObject({ orders: true, favorites: false, cashback: true, offers: true });
    expect(yes.offersChosenAt).not.toBeNull();

    // Saved again unchanged, the date stays; a no is a choice with its own date.
    const again = (await call('PUT', '/api/stores/lessari/customer/me/notifications', shopper, { orders: true, favorites: true, cashback: true, offers: true })).json<CustomerNotifications>();
    expect(again.offersChosenAt).toBe(yes.offersChosenAt);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const no = (await call('PUT', '/api/stores/lessari/customer/me/notifications', shopper, { orders: true, favorites: true, cashback: true, offers: false })).json<CustomerNotifications>();
    expect(no.offers).toBe(false);
    expect(no.offersChosenAt).not.toBe(yes.offersChosenAt);

    for (const payload of [{ orders: 'sim', favorites: true, cashback: true, offers: false }, { orders: true, favorites: true }, { orders: true, favorites: true, cashback: true, offers: false, email: 'x@y.z' }]) {
      expect((await call('PUT', '/api/stores/lessari/customer/me/notifications', shopper, payload)).statusCode, JSON.stringify(payload)).toBe(400);
    }
    expect((await call('PUT', '/api/stores/lessari/customer/me/notifications', undefined, { orders: true, favorites: true, cashback: true, offers: true })).statusCode).toBe(401);
  });
});
