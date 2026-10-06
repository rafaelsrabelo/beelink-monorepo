// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import type { MockInstance } from 'vitest';

// Types
import type { CustomerConversation, Order, OrderPage, RealtimeEvent, ShopConversation } from '@harness-monorepo/contracts';

// App
import { AsaasClient, AsaasUnreachable } from '../src/modules/integrations/asaas/asaas.client.js';
import { AsaasEvents } from '../src/modules/payment-events/asaas-events.service.js';
import { PaymentReconciliation } from '../src/modules/payment-events/payment-reconciliation.js';
import { OrderPaidMailer } from '../src/modules/payments/order-paid-mailer.js';
import { RealtimePublisher } from '../src/modules/realtime/realtime-publisher.js';
import { MailService } from '../src/shared/mail/mail.service.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { createTestApp } from './support/create-test-app.js';
import { FakeAsaas } from './support/fake-asaas.js';
import { clearInbox, waitForMessage } from './support/mailpit.js';
import { openOnlineShop, type OnlineShop } from './support/online-shop.js';
import { resetDatabase } from './support/reset-database.js';

const DAY_MS = 24 * 60 * 60_000;

describe('a paid order tells its customer and its shop (BEELINK-207)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let events: AsaasEvents;
  let mailer: OrderPaidMailer;
  let shop: OnlineShop;
  let told: MockInstance<RealtimePublisher['publish']>;
  let sent: MockInstance<MailService['sendPaymentApproved']>;
  const asaas = new FakeAsaas();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(AsaasClient).useValue(asaas));
    prisma = app.get(PrismaService);
    events = app.get(AsaasEvents);
    mailer = app.get(OrderPaidMailer);
    told = vi.spyOn(app.get(RealtimePublisher), 'publish');
    sent = vi.spyOn(app.get(MailService), 'sendPaymentApproved');
  });

  afterAll(async () => {
    await events.settled();
    await app.close();
  });

  beforeEach(async () => {
    await events.settled();
    await resetDatabase(prisma);
    await clearInbox();
    asaas.reset();
    shop = await openOnlineShop(app, prisma, 'lessari');
    told.mockClear();
    sent.mockClear();
  });

  const email = () => shop.shopper.user.email;
  const paymentNews = () => told.mock.calls.map(([, event]) => event).filter((event): event is Extract<RealtimeEvent, { type: 'order.payment' }> => event.type === 'order.payment');
  const notices = () => prisma.orderPaidNotice.findMany({ orderBy: { createdAt: 'asc' } });
  const talk = async (number = 1) => (await shop.call('GET', `/api/stores/lessari/customer/orders/${number}/conversation`, shop.shopper)).json<CustomerConversation>();
  const list = async (query: string) => (await shop.call('GET', `/api/stores/lessari/orders?${query}`, shop.owner)).json<OrderPage>();
  const numbers = async (query: string) => (await list(query)).orders.map((order) => order.number);
  /** Asaas tells of the order's charge, and whatever that led to is finished — the e-mail included. */
  async function hear(id: string, chargeIndex = 0, number = 1) {
    const response = await shop.event({ id, event: 'PAYMENT_RECEIVED', payment: { id: asaas.payments[chargeIndex]!.id, externalReference: await shop.orderId(number) } });
    expect(response.statusCode).toBe(200);
    await events.settled();
    await mailer.flush();
  }

  describe('the customer', () => {
    it('gets one e-mail and one line in the conversation, whatever tells of the payment again', async () => {
      await shop.place({ paymentMethod: 'CREDIT_CARD', installments: 3 });
      asaas.pay(asaas.payments[0]!.id, 'CONFIRMED');

      await hear('evt_1');

      const mail = await waitForMessage(email(), 10_000, 'pagamento');
      expect(mail.Subject).toBe('lessari — pagamento do pedido nº 1 aprovado');
      // The amount as `Intl` writes it, with its no-break space.
      expect(mail.Text).toMatch(/O pagamento do seu pedido nº 1 em lessari foi aprovado: R\$\s59,90 no cartão de crédito, em 3x\./);
      expect(mail.Text).toContain('/lessari/conta/pedidos/1');
      expect(mail.Text).toContain('desmarque "Andamento dos pedidos"');
      expect(mail.HTML).toContain('Ver pedido');
      expect(await notices()).toMatchObject([{ storeId: shop.storeId, sentAt: expect.any(Date), toldAt: expect.any(Date), seenAt: null, attempts: 1 }]);

      const lines = (await talk()).messages;
      expect(lines.map((line) => line.kind)).toEqual(['STATUS', 'PAYMENT']);
      expect(lines[1]).toMatchObject({ kind: 'PAYMENT', readAt: null });
      // News to the customer, the shop's own money to the shop.
      expect((await talk()).unread).toBe(1);
      expect((await shop.call('GET', '/api/stores/lessari/orders/1/conversation', shop.owner)).json<ShopConversation>().unread).toBe(0);

      // The same event again, another event of the same charge, the reconciliation, and the card's
      // money landing a month later: none of them is the news a second time.
      await hear('evt_1');
      await hear('evt_2');
      asaas.pay(asaas.payments[0]!.id, 'RECEIVED');
      await hear('evt_3');
      await app.get(PaymentReconciliation).checkDue(new Date(Date.now() + 40 * DAY_MS));
      await mailer.flush();

      expect(sent).toHaveBeenCalledTimes(1);
      expect(await notices()).toHaveLength(1);
      expect((await talk()).messages.filter((line) => line.kind === 'PAYMENT')).toHaveLength(1);
      expect(paymentNews()).toEqual([
        { type: 'order.payment', orderNumber: 1, status: 'CONFIRMED', stray: null, approved: true },
        { type: 'order.payment', orderNumber: 1, status: 'RECEIVED', stray: null, approved: false },
      ]);
    });

    it('gets no e-mail with order notices turned off, and still reads it in the conversation', async () => {
      expect((await shop.call('PUT', '/api/stores/lessari/customer/me/notifications', shop.shopper, { orders: false, favorites: true, offers: false })).statusCode).toBe(200);
      expect((await prisma.customer.findFirstOrThrow({ where: { user: { email: email() } } })).notifyOrders).toBe(false);
      await shop.place();
      asaas.pay(asaas.payments[0]!.id);

      await hear('evt_1');

      expect(sent).not.toHaveBeenCalled();
      // Born done: nothing is left for a later sweep to send, even with the notice turned on again.
      const [notice] = await notices();
      expect(notice).toMatchObject({ attempts: 0 });
      expect(notice!.sentAt).toEqual(notice!.createdAt);
      await prisma.customer.updateMany({ data: { notifyOrders: true } });
      expect(await mailer.flush()).toBe(0);
      expect((await talk()).messages.map((line) => line.kind)).toEqual(['STATUS', 'PAYMENT']);
      expect(paymentNews()).toMatchObject([{ approved: true }]);
    });

    it('is owed nothing by an account that never confirmed its e-mail', async () => {
      await shop.place();
      await prisma.user.updateMany({ where: { email: email() }, data: { emailVerifiedAt: null } });
      asaas.pay(asaas.payments[0]!.id);

      await hear('evt_1');

      expect(sent).not.toHaveBeenCalled();
      expect(await notices()).toMatchObject([{ attempts: 0, sentAt: expect.any(Date) }]);
    });

    it('tries the e-mail again when it did not go, and sends it once', async () => {
      sent.mockResolvedValueOnce(false);
      await shop.place();
      asaas.pay(asaas.payments[0]!.id);

      await hear('evt_1');

      expect(await notices()).toMatchObject([{ sentAt: null, attempts: 1 }]);
      // The sweep that failed may still be writing when it tries next: made due again until one takes it.
      await vi.waitFor(async () => {
        await prisma.orderPaidNotice.updateMany({ where: { sentAt: null }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
        expect(await mailer.flush()).toBe(1);
      });
      expect((await waitForMessage(email(), 10_000, 'pagamento')).Subject).toContain('aprovado');
      expect(await mailer.flush()).toBe(0);
    });

    it('is not told a payment was approved when it arrives for an order already cancelled', async () => {
      await shop.place();
      // Cancelled with Asaas not answering: its charge is still payable there.
      asaas.failing('charges', new AsaasUnreachable('Asaas failed (503)'));
      asaas.failing('charges', new AsaasUnreachable('Asaas failed (503)'));
      expect((await shop.cancel()).statusCode).toBe(200);
      asaas.pay(asaas.payments[0]!.id);

      await hear('evt_1');

      expect((await shop.panelOrder()).payment?.strays).toHaveLength(1);
      expect(await notices()).toEqual([]);
      expect(sent).not.toHaveBeenCalled();
      expect((await talk()).messages.map((line) => line.kind)).toEqual(['STATUS', 'STATUS']);
      expect(paymentNews()).toMatchObject([{ stray: 'ORDER_CANCELLED', approved: false }]);
    });
  });

  describe("the shop's panel", () => {
    it('filters its orders by where the money stands, and each row says it', async () => {
      await shop.place();
      await shop.place();
      await shop.place({ paymentChannel: 'OFFLINE' });
      await shop.place();
      expect((await shop.cancel(4)).statusCode).toBe(200);
      asaas.pay(asaas.payments[0]!.id);
      await hear('evt_1');

      expect(await numbers('payment=PAID')).toEqual([1]);
      // Charged online, standing, and never paid: not the one settled with the shop, nor the cancelled one.
      expect(await numbers('payment=PENDING')).toEqual([2]);
      expect(await numbers('payment=PENDING&status=RECEIVED')).toEqual([2]);
      expect(await numbers('payment=PAID&status=DELIVERED')).toEqual([]);
      expect(await numbers('payment=STRAY')).toEqual([]);
      expect(await numbers('')).toEqual([4, 3, 2, 1]);
      expect((await shop.call('GET', '/api/stores/lessari/orders?payment=SOMETHING', shop.owner)).statusCode).toBe(400);

      const rows = (await list('')).orders;
      expect(rows.find((order) => order.number === 1)).toMatchObject({ paymentChannel: 'ONLINE', payment: { status: 'RECEIVED', paidAt: expect.any(String) }, strays: 0 });
      expect(rows.find((order) => order.number === 2)).toMatchObject({ payment: { status: 'PENDING', paidAt: null }, strays: 0 });
      expect(rows.find((order) => order.number === 3)).toMatchObject({ paymentChannel: 'OFFLINE', payment: null });
    });

    it('finds the orders with money they did not ask for', async () => {
      await shop.place();
      await shop.place();
      asaas.pay(asaas.payments[0]!.id);
      await hear('evt_1');
      asaas.payments.push({ ...asaas.payments[0]!, id: 'pay_segunda', status: 'RECEIVED' });

      await hear('evt_2', 2);

      expect(await numbers('payment=STRAY')).toEqual([1]);
      expect((await list('payment=STRAY')).orders[0]).toMatchObject({ strays: 1 });
      // Still the order's payment: a stray beside it does not make it unpaid.
      expect(await numbers('payment=PAID')).toEqual([1]);
    });

    it("lists a paid order for the bell until somebody opens it, and only the shop's own people say so", async () => {
      await shop.place();
      await shop.place();
      asaas.pay(asaas.payments[0]!.id);
      await hear('evt_1');

      expect(await numbers('payment=PAID_UNSEEN')).toEqual([1]);
      expect((await shop.panelOrder()).payment).toMatchObject({ status: 'RECEIVED', unseen: true });
      // Reading the order is not opening it: a list, a prefetch or the bell itself read it too.
      expect(await numbers('payment=PAID_UNSEEN')).toEqual([1]);

      expect((await shop.call('POST', '/api/stores/lessari/orders/1/payment/seen', shop.shopper)).statusCode).toBe(401);
      expect((await shop.call('POST', '/api/stores/lessari/orders/1/payment/seen')).statusCode).toBe(401);
      expect((await shop.call('POST', '/api/stores/lessari/orders/99/payment/seen', shop.owner)).statusCode).toBe(404);
      const seen = await shop.call('POST', '/api/stores/lessari/orders/1/payment/seen', shop.owner);
      expect(seen.statusCode).toBe(204);

      expect(await numbers('payment=PAID_UNSEEN')).toEqual([]);
      expect((await shop.panelOrder()).payment).toMatchObject({ unseen: false });
      expect(await numbers('payment=PAID')).toEqual([1]);
      // Said again, and of an order nobody paid: nothing changes.
      expect((await shop.call('POST', '/api/stores/lessari/orders/1/payment/seen', shop.owner)).statusCode).toBe(204);
      expect((await shop.call('POST', '/api/stores/lessari/orders/2/payment/seen', shop.owner)).statusCode).toBe(204);
      expect((await shop.call('GET', '/api/stores/lessari/orders/2', shop.owner)).json<Order>().payment).toMatchObject({ status: 'PENDING', unseen: false });
    });

    it('keeps one shop out of another shop\'s paid orders', async () => {
      const other = await openOnlineShop(app, prisma, 'outra');
      await shop.place();
      asaas.pay(asaas.payments[0]!.id);
      await hear('evt_1');

      expect((await other.call('GET', '/api/stores/outra/orders?payment=PAID_UNSEEN', other.owner)).json<OrderPage>().orders).toEqual([]);
      expect((await other.call('POST', '/api/stores/lessari/orders/1/payment/seen', other.owner)).statusCode).toBe(403);
      expect(await numbers('payment=PAID_UNSEEN')).toEqual([1]);
    });
  });
});
