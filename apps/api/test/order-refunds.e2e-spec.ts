// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import type { MockInstance } from 'vitest';

// Types
import type { ApiErrorBody, CustomerConversation, CustomerOrder, Order, OrderPage, RefundOrderPayload } from '@harness-monorepo/contracts';

// App
import { AsaasClient, AsaasOutcomeUnknown, AsaasRefused, AsaasThrottled } from '../src/modules/integrations/asaas/asaas.client.js';
import { AsaasEvents } from '../src/modules/payment-events/asaas-events.service.js';
import { PaymentReconciliation } from '../src/modules/payment-events/payment-reconciliation.js';
import { UnpaidOrders } from '../src/modules/payment-events/unpaid-orders.js';
import { OrderPaidMailer } from '../src/modules/payments/order-paid-mailer.js';
import { OrderRefundMailer } from '../src/modules/payments/order-refund-mailer.js';
import { MailService } from '../src/shared/mail/mail.service.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { createTestApp } from './support/create-test-app.js';
import { afterwards, FakeAsaas } from './support/fake-asaas.js';
import { clearInbox, waitForMessage } from './support/mailpit.js';
import { openOnlineShop, type OnlineShop } from './support/online-shop.js';
import { resetDatabase } from './support/reset-database.js';

const DAY_MS = 24 * 60 * 60_000;
const TOTAL = 5990;

describe('the shop gives money back from the order (BEELINK-208)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let events: AsaasEvents;
  let mailer: OrderRefundMailer;
  let shop: OnlineShop;
  let sent: MockInstance<MailService['sendPaymentRefunded']>;
  const asaas = new FakeAsaas();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(AsaasClient).useValue(asaas));
    prisma = app.get(PrismaService);
    events = app.get(AsaasEvents);
    mailer = app.get(OrderRefundMailer);
    sent = vi.spyOn(app.get(MailService), 'sendPaymentRefunded');
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
    sent.mockClear();
  });

  const charge = (index = 0) => asaas.payments[index]!;
  const refunds = () => prisma.orderRefund.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  const talk = async () => (await shop.call('GET', '/api/stores/lessari/customer/orders/1/conversation', shop.shopper)).json<CustomerConversation>();
  const customerOrder = async () => (await shop.call('GET', '/api/stores/lessari/customer/orders/1', shop.shopper)).json<CustomerOrder>();
  const numbers = async (query: string) => (await shop.call('GET', `/api/stores/lessari/orders?${query}`, shop.owner)).json<OrderPage>().orders.map((order) => order.number);
  const refund = (body: Partial<RefundOrderPayload> = {}) => shop.call('POST', '/api/stores/lessari/orders/1/refunds', shop.owner, { amountCents: TOTAL, reason: 'Produto com defeito', refundableCents: TOTAL, ...body });
  const cancel = (body: object = {}) => shop.call('PATCH', '/api/stores/lessari/orders/1/status', shop.owner, { status: 'CANCELLED', ...body });
  const errorOf = (response: { json: <T>() => T }) => response.json<ApiErrorBody>();

  /** Asaas tells of the order's charge, and whatever that led to is finished — the e-mails included. */
  async function hear(id: string, event = 'PAYMENT_RECEIVED', chargeId = charge().id) {
    const response = await shop.event({ id, event, payment: { id: chargeId, externalReference: await shop.orderId() } });
    expect(response.statusCode).toBe(200);
    await events.settled();
    await app.get(OrderPaidMailer).flush();
    await mailer.flush();
  }

  /** An order placed and paid, as a webhook tells it. */
  async function paid(body: object = {}, status = 'RECEIVED') {
    await shop.place(body);
    asaas.pay(charge().id, status);
    await hear('evt_paid');
  }

  describe('a refund asked on the order', () => {
    it('gives all of it back: once at Asaas, with the amount and the reason, and both sides read it', async () => {
      await paid();

      const response = await refund();

      expect(response.statusCode).toBe(200);
      expect(asaas.refunded).toEqual([{ target: { id: charge().id, installmentId: null }, valueCents: TOTAL, description: 'Produto com defeito' }]);
      const order = response.json<Order>();
      // Refunding does not cancel: that is another act.
      expect(order.status).toBe('RECEIVED');
      expect(order.payment).toMatchObject({ status: 'REFUNDED', amountCents: TOTAL, refundedCents: TOTAL, refundingCents: 0, refundableCents: 0 });
      expect(order.payment?.refunds).toMatchObject([{ amountCents: TOTAL, status: 'DONE', origin: 'PANEL', reason: 'Produto com defeito', lastError: null, stray: false, doneAt: expect.any(String) }]);
      expect(await refunds()).toMatchObject([{ storeId: shop.storeId, providerId: charge().id, requestedById: shop.owner.user.id, claimedUntil: null, acceptedAt: expect.any(Date) }]);

      const theirs = await customerOrder();
      expect(theirs.payment).toMatchObject({ status: 'REFUNDED', refundedCents: TOTAL, refunds: [{ amountCents: TOTAL, status: 'DONE' }] });
      // Never why: the reason is the shop's own note.
      expect(JSON.stringify(theirs)).not.toContain('defeito');
      expect((await shop.readPayment())?.refunds).toMatchObject([{ amountCents: TOTAL, status: 'DONE' }]);
    });

    it('gives it back in two parts that add up to all of it, and not a cent more', async () => {
      await paid();

      const first = await refund({ amountCents: 2000 });
      expect(first.json<Order>().payment).toMatchObject({ status: 'PARTIALLY_REFUNDED', refundedCents: 2000, refundableCents: 3990 });
      // The shop still holds money: the order counts as paid, and as refunded.
      expect(await numbers('payment=PAID')).toEqual([1]);
      expect(await numbers('payment=REFUNDED')).toEqual([1]);

      const over = await refund({ amountCents: 4000, refundableCents: 3990 });
      expect(over.statusCode).toBe(409);
      expect(errorOf(over)).toMatchObject({ errorCode: 'REFUND_EXCEEDS', details: { refundableCents: 3990 } });

      const second = await refund({ amountCents: 3990, refundableCents: 3990, reason: 'O resto' });
      expect(second.json<Order>().payment).toMatchObject({ status: 'REFUNDED', refundedCents: TOTAL, refundableCents: 0 });
      expect(asaas.refunded.map((each) => each.valueCents)).toEqual([2000, 3990]);
      expect(await numbers('payment=PAID')).toEqual([]);

      const more = await refund({ amountCents: 1, refundableCents: 0 });
      expect(more.statusCode).toBe(409);
      expect(errorOf(more).errorCode).toBe('REFUND_NOTHING_TO_REFUND');
      expect(asaas.refunded).toHaveLength(2);
    });

    it('refuses one sent from a screen that has gone stale, an order never paid, and what a validator can tell', async () => {
      await shop.place();
      expect(errorOf(await refund({ refundableCents: 0 })).errorCode).toBe('REFUND_NOTHING_TO_REFUND');

      asaas.pay(charge().id);
      await hear('evt_paid');
      await refund({ amountCents: 1000 });
      // The other tab still shows all of it as left.
      const stale = await refund({ amountCents: 1000 });
      expect(stale.statusCode).toBe(409);
      expect(errorOf(stale).errorCode).toBe('REFUND_STALE');

      expect((await refund({ amountCents: 0 })).statusCode).toBe(400);
      expect((await refund({ reason: ' a ' })).statusCode).toBe(400);
      expect((await shop.call('POST', '/api/stores/lessari/orders/1/refunds', shop.shopper, { amountCents: 1, reason: 'Meu', refundableCents: 4990 })).statusCode).toBeGreaterThanOrEqual(401);
      expect(asaas.refunded).toHaveLength(1);
    });

    it('makes one refund of two askings at once', async () => {
      await paid();
      let open!: () => void;
      const held = new Promise<void>((resolve) => (open = resolve));
      asaas.before('refund', () => held);

      const first = refund();
      await vi.waitFor(() => expect(asaas.count('refund')).toBe(1));
      const second = await refund();
      open();

      expect(second.statusCode).toBe(409);
      expect(errorOf(second).errorCode).toBe('REFUND_IN_PROGRESS');
      expect((await first).statusCode).toBe(200);
      expect(asaas.refunded).toHaveLength(1);
      expect(await refunds()).toMatchObject([{ status: 'DONE' }]);
    });

    it('reads the charge after a silence, and counts a refund that was made as made', async () => {
      await paid();
      asaas.failing('refund', afterwards(new AsaasOutcomeUnknown('Asaas did not answer')));

      const response = await refund();

      expect(response.statusCode).toBe(200);
      expect(asaas.count('refundsOf')).toBe(1);
      expect(response.json<Order>().payment).toMatchObject({ status: 'REFUNDED', refundedCents: TOTAL });
      expect(asaas.refunded).toHaveLength(1);
    });

    it('asks nothing again after a silence until the charge was read, and then only what was not made', async () => {
      await paid();
      // Never made, and nobody knows.
      asaas.failing('refund', new AsaasOutcomeUnknown('Asaas did not answer'));

      const silent = await refund();
      expect(silent.statusCode).toBe(503);
      expect(errorOf(silent).errorCode).toBe('REFUND_UNCONFIRMED');
      expect(await refunds()).toMatchObject([{ status: 'REQUESTED', claimedUntil: expect.any(Date) }]);
      expect((await shop.panelOrder()).payment).toMatchObject({ status: 'RECEIVED', refundedCents: 0, refundableCents: 0 });

      // At once: nobody asks while it may still show.
      const hurried = await refund();
      expect(errorOf(hurried).errorCode).toBe('REFUND_IN_PROGRESS');
      expect(asaas.count('refund')).toBe(1);

      // Its time ran out: the charge is read, shows nothing, and only then is the refund asked again.
      await prisma.orderRefund.updateMany({ data: { claimedUntil: new Date(Date.now() - 1000) } });
      const again = await refund({ refundableCents: 0 });
      expect(errorOf(again).errorCode).toBe('REFUND_STALE');
      expect(await refunds()).toMatchObject([{ status: 'REFUSED', lastError: expect.stringContaining('did not answer') }]);
      const made = await refund();
      expect(made.statusCode).toBe(200);
      expect(asaas.refunded).toHaveLength(1);
      expect((await refunds()).map((row) => row.status)).toEqual(['REFUSED', 'DONE']);
    });

    it('finds a refund made behind a silence when it is asked again, and makes no second one', async () => {
      await paid();
      // Made, the answer lost, and the reading lost too.
      asaas.failing('refund', afterwards(new AsaasOutcomeUnknown('Asaas did not answer')));
      asaas.failing('refundsOf', new AsaasOutcomeUnknown('Asaas did not answer'));

      expect(errorOf(await refund()).errorCode).toBe('REFUND_UNCONFIRMED');
      await prisma.orderRefund.updateMany({ data: { claimedUntil: new Date(Date.now() - 1000) } });
      const again = await refund();

      // What is left changed under the screen: the first one had been made.
      expect(errorOf(again).errorCode).toBe('REFUND_STALE');
      expect(asaas.refunded).toHaveLength(1);
      expect((await shop.panelOrder()).payment).toMatchObject({ status: 'REFUNDED', refundedCents: TOTAL, refunds: [{ status: 'DONE' }] });
    });

    it("tells the shop each of Asaas's refusals, and keeps them on the order", async () => {
      await paid();
      asaas.failing('refund', new AsaasRefused(400, 'invalid_action', 'Saldo insuficiente para realizar o estorno.'));
      asaas.failing('refund', new AsaasRefused(400, 'invalid_action', 'O prazo para estorno desta cobrança expirou.'));
      asaas.failing('refund', new AsaasThrottled('Asaas failed (429)', null));

      const balance = await refund();
      expect(balance.statusCode).toBe(502);
      expect(errorOf(balance).errorCode).toBe('REFUND_NO_BALANCE');
      const other = await refund();
      expect(errorOf(other)).toMatchObject({ errorCode: 'REFUND_REFUSED', details: { reason: 'O prazo para estorno desta cobrança expirou.' } });
      // Turned away before anything was done: nothing is kept of it.
      const throttled = await refund();
      expect(throttled.statusCode).toBe(503);
      expect(errorOf(throttled).errorCode).toBe('PAYMENT_UNAVAILABLE');

      const order = await shop.panelOrder();
      expect(order.payment).toMatchObject({ status: 'RECEIVED', refundedCents: 0, refundableCents: TOTAL });
      expect(order.payment?.refunds).toMatchObject([
        { status: 'REFUSED', lastError: 'Saldo insuficiente para realizar o estorno.' },
        { status: 'REFUSED', lastError: 'O prazo para estorno desta cobrança expirou.' },
      ]);
      // A refund that never was is the shop's business alone.
      expect((await customerOrder()).payment?.refunds).toEqual([]);
      expect((await talk()).messages.map((line) => line.kind)).not.toContain('REFUND');
    });
  });

  describe('a card', () => {
    it('is refunded by its plan, reads as on its way until Asaas concludes it, and takes no second refund meanwhile', async () => {
      await paid({ paymentMethod: 'CREDIT_CARD', installments: 3 }, 'CONFIRMED');
      const plan = charge().installmentId;
      for (const each of asaas.payments) each.status = 'CONFIRMED';

      const response = await refund({ amountCents: 3000 });

      expect(response.statusCode).toBe(200);
      expect(asaas.refunded).toEqual([{ target: { id: charge().id, installmentId: plan }, valueCents: 3000, description: 'Produto com defeito' }]);
      expect(response.json<Order>().payment).toMatchObject({ status: 'CONFIRMED', refundedCents: 0, refundingCents: 3000, refundableCents: 2990, providerStatus: 'REFUND_IN_PROGRESS', refunds: [{ status: 'PROCESSING', doneAt: null }] });
      expect((await customerOrder()).payment).toMatchObject({ status: 'CONFIRMED', refundingCents: 3000, refunds: [{ amountCents: 3000, status: 'PROCESSING' }] });
      expect(await numbers('payment=REFUNDED')).toEqual([1]);

      const meanwhile = await refund({ amountCents: 1000, refundableCents: 2990 });
      expect(errorOf(meanwhile).errorCode).toBe('REFUND_NOT_READY');
      expect(asaas.refunded).toHaveLength(1);

      asaas.concludeRefunds(charge().id);
      await hear('evt_refunded', 'PAYMENT_PARTIALLY_REFUNDED');

      expect((await shop.panelOrder()).payment).toMatchObject({ status: 'PARTIALLY_REFUNDED', refundedCents: 3000, refundingCents: 0, refunds: [{ status: 'DONE', doneAt: expect.any(String) }] });
      // Told when Asaas took it, not again when it concluded.
      expect(sent).toHaveBeenCalledTimes(1);
    });

    it('keeps one refund of the amount asked when the listing shows none, and still sees it conclude', async () => {
      asaas.listsRefunds = false;
      await paid({ paymentMethod: 'CREDIT_CARD' }, 'CONFIRMED');

      const response = await refund({ amountCents: 3000 });
      await hear('evt_progress', 'PAYMENT_REFUND_IN_PROGRESS');

      // The rest of the charge is not guessed to be on its way too.
      expect(response.statusCode).toBe(200);
      expect((await shop.panelOrder()).payment).toMatchObject({ refundingCents: 3000, refundableCents: 2990, refunds: [{ amountCents: 3000, status: 'PROCESSING' }] });
      expect(sent).toHaveBeenCalledTimes(1);
      // A paid order with money still held is not cancelled on a refund nobody made.
      expect(errorOf(await cancel()).errorCode).toBe('ORDER_PAID');

      asaas.concludeRefunds(charge().id);
      await hear('evt_done', 'PAYMENT_PARTIALLY_REFUNDED');

      expect((await shop.panelOrder()).payment).toMatchObject({ status: 'PARTIALLY_REFUNDED', refundedCents: 3000, refundingCents: 0, refunds: [{ status: 'DONE' }] });
      expect(await refunds()).toHaveLength(1);
    });

    it('denies the one of two refunds on their way that Asaas cancelled, by its amount', async () => {
      await paid({ paymentMethod: 'CREDIT_CARD' }, 'CONFIRMED');
      await refund({ amountCents: 2000 });
      // Asaas lets a second one be asked while the first is on its way.
      charge().status = 'CONFIRMED';
      await hear('evt_back', 'PAYMENT_UPDATED');
      expect((await refund({ amountCents: 3000, refundableCents: 3990 })).statusCode).toBe(200);

      charge().refunds[0]!.status = 'CANCELLED';
      await hear('evt_denied', 'PAYMENT_REFUND_DENIED');

      expect((await refunds()).map((row) => [row.amountCents, row.status])).toEqual([
        [2000, 'DENIED'],
        [3000, 'PROCESSING'],
      ]);
      expect((await shop.panelOrder()).payment).toMatchObject({ refundingCents: 3000, refundableCents: 2990 });
    });

    it('is asked about by the reconciliation while its refund is on its way, when the event never comes', async () => {
      await paid({ paymentMethod: 'CREDIT_CARD' }, 'CONFIRMED');
      await refund();
      expect((await shop.rows())[0]).toMatchObject({ refundingCents: TOTAL, nextCheckAt: expect.any(Date) });
      asaas.concludeRefunds(charge().id);

      await app.get(PaymentReconciliation).checkDue(new Date(Date.now() + DAY_MS));

      expect((await shop.rows())[0]).toMatchObject({ status: 'REFUNDED', refundedCents: TOTAL, refundingCents: 0, nextCheckAt: null });
    });

    it('reads a refund Asaas took and then cancelled as denied, and leaves the money to be refunded again', async () => {
      await paid({ paymentMethod: 'CREDIT_CARD' }, 'CONFIRMED');
      await refund();
      asaas.denyRefunds(charge().id);

      await hear('evt_denied', 'PAYMENT_REFUND_DENIED');

      expect((await shop.panelOrder()).payment).toMatchObject({ status: 'CONFIRMED', refundedCents: 0, refundingCents: 0, refundableCents: TOTAL, refunds: [{ status: 'DENIED', lastError: expect.any(String) }] });
      expect((await customerOrder()).payment?.refunds).toEqual([]);
    });
  });

  describe('a refund made at Asaas itself', () => {
    it('is read here by the event that tells of it, and told to the customer once', async () => {
      await paid();
      asaas.refundOutside(charge().id, 2000);

      await hear('evt_partial', 'PAYMENT_PARTIALLY_REFUNDED');
      await hear('evt_partial', 'PAYMENT_PARTIALLY_REFUNDED');
      await hear('evt_again', 'PAYMENT_PARTIALLY_REFUNDED');

      expect((await shop.panelOrder()).payment).toMatchObject({ status: 'PARTIALLY_REFUNDED', refundedCents: 2000, refundableCents: 3990, refunds: [{ amountCents: 2000, status: 'DONE', origin: 'ASAAS', reason: null }] });
      expect(await refunds()).toHaveLength(1);
      expect(sent).toHaveBeenCalledTimes(1);

      asaas.refundOutside(charge().id, 3990);
      await hear('evt_whole', 'PAYMENT_REFUNDED');

      expect((await shop.panelOrder()).payment).toMatchObject({ status: 'REFUNDED', refundedCents: TOTAL, refunds: [{ amountCents: 2000 }, { amountCents: 3990, origin: 'ASAAS' }] });
      expect(asaas.count('refund')).toBe(0);
    });
  });

  describe('cancelling a paid order', () => {
    it('refunds first, and cancels once Asaas took the refund', async () => {
      await paid();

      const bare = await cancel();
      expect(bare.statusCode).toBe(409);
      expect(errorOf(bare).errorCode).toBe('ORDER_PAID');
      expect(asaas.refunded).toHaveLength(0);

      const response = await cancel({ refund: { reason: 'Sem estoque', refundableCents: TOTAL } });

      expect(response.statusCode).toBe(200);
      const order = response.json<Order>();
      expect(order.status).toBe('CANCELLED');
      expect(asaas.refunded).toEqual([{ target: { id: charge().id, installmentId: null }, valueCents: TOTAL, description: 'Sem estoque' }]);
      const after = await shop.panelOrder();
      expect(after.payment).toMatchObject({ status: 'REFUNDED', refundedCents: TOTAL, strays: [], refunds: [{ origin: 'CANCELLATION', reason: 'Sem estoque', status: 'DONE' }] });
      expect((await customerOrder()).cancelledBy).toBe('SHOP');
    });

    it('cancels a card whose refund is on its way, and keeps no stray payment of it', async () => {
      await paid({ paymentMethod: 'CREDIT_CARD' }, 'CONFIRMED');

      const response = await cancel({ refund: { reason: 'Sem estoque', refundableCents: TOTAL } });
      expect(response.statusCode).toBe(200);
      await hear('evt_progress', 'PAYMENT_REFUND_IN_PROGRESS');

      const order = await shop.panelOrder();
      expect(order).toMatchObject({ status: 'CANCELLED', payment: { status: 'CONFIRMED', refundingCents: TOTAL, strays: [] } });
      expect(await prisma.orderStrayPayment.count()).toBe(0);
      expect(await numbers('payment=STRAY')).toEqual([]);
    });

    it('leaves the order as it was when Asaas refuses the refund, and says why', async () => {
      await paid();
      const stock = () => prisma.productVariant.findUniqueOrThrow({ where: { id: shop.variantId }, select: { stockQuantity: true } });
      const before = await stock();
      asaas.failing('refund', new AsaasRefused(400, 'invalid_action', 'Saldo insuficiente para realizar o estorno.'));

      const response = await cancel({ refund: { reason: 'Sem estoque', refundableCents: TOTAL } });

      expect(response.statusCode).toBe(502);
      expect(errorOf(response).errorCode).toBe('REFUND_NO_BALANCE');
      const order = await shop.panelOrder();
      expect(order.status).toBe('RECEIVED');
      expect(order.payment).toMatchObject({ status: 'RECEIVED', refundedCents: 0, refunds: [{ status: 'REFUSED', origin: 'CANCELLATION' }] });
      expect(await stock()).toEqual(before);
    });

    it('cancels with no new refund an order the shop had already refunded whole, and never lets the customer cancel a paid one', async () => {
      await paid();
      const theirs = await shop.cancel();
      expect(theirs.statusCode).toBe(409);
      expect(errorOf(theirs).errorCode).toBe('ORDER_PAID');

      await refund();
      const response = await cancel();

      expect(response.statusCode).toBe(200);
      expect(response.json<Order>().status).toBe('CANCELLED');
      expect(asaas.refunded).toHaveLength(1);
    });
  });

  describe('money the order did not ask for', () => {
    it('is refunded from the order, and stops being told of once Asaas took the refund', async () => {
      await paid();
      asaas.payments.push({ ...charge(), id: 'pay_segunda', status: 'RECEIVED', refunds: [] });
      await hear('evt_second', 'PAYMENT_RECEIVED', 'pay_segunda');
      const stray = (await shop.panelOrder()).payment!.strays[0]!;
      expect(stray).toMatchObject({ reason: 'ORDER_ALREADY_PAID', refundableCents: TOTAL, resolvedAt: null });
      expect(await numbers('payment=STRAY')).toEqual([1]);

      const response = await refund({ strayId: stray.id, reason: 'Pago em dobro' });

      expect(response.statusCode).toBe(200);
      expect(asaas.refunded).toEqual([{ target: { id: 'pay_segunda', installmentId: null }, valueCents: TOTAL, description: 'Pago em dobro' }]);
      const payment = response.json<Order>().payment!;
      // The order's own payment is untouched.
      expect(payment).toMatchObject({ status: 'RECEIVED', refundedCents: 0, refundableCents: TOTAL });
      expect(payment.strays).toMatchObject([{ id: stray.id, refundableCents: 0, resolvedAt: expect.any(String) }]);
      expect(payment.refunds).toMatchObject([{ stray: true, status: 'DONE', amountCents: TOTAL }]);
      expect(await numbers('payment=STRAY')).toEqual([]);
      expect((await shop.call('GET', '/api/stores/lessari/orders', shop.owner)).json<OrderPage>().orders[0]?.strays).toBe(0);
      // Not the order's own payment: its customer's page shows no refund of it, and the e-mail still goes.
      expect((await customerOrder()).payment?.refunds).toEqual([]);
      expect(sent).toHaveBeenCalledTimes(1);

      expect(errorOf(await refund({ strayId: stray.id, refundableCents: 0 })).errorCode).toBe('REFUND_NOTHING_TO_REFUND');
    });

    it('is refunded, and read after a silence, as the plan it is when it was paid in instalments', async () => {
      await paid();
      const instalment = (id: string, number: number) => ({ ...charge(), id, status: 'CONFIRMED', billingType: 'CREDIT_CARD', valueCents: 2995, installmentId: 'ins_segunda', installmentNumber: number, refunds: [] });
      asaas.payments.push(instalment('pay_a', 1), instalment('pay_b', 2));
      await hear('evt_second', 'PAYMENT_CONFIRMED', 'pay_a');
      const stray = (await shop.panelOrder()).payment!.strays[0]!;
      expect(stray).toMatchObject({ reason: 'ORDER_ALREADY_PAID', amountCents: TOTAL });
      // Made, the answer lost, and the reading lost too.
      asaas.failing('refund', afterwards(new AsaasOutcomeUnknown('Asaas did not answer')));
      asaas.failing('refundsOf', new AsaasOutcomeUnknown('Asaas did not answer'));

      expect(errorOf(await refund({ strayId: stray.id })).errorCode).toBe('REFUND_UNCONFIRMED');
      await prisma.orderRefund.updateMany({ data: { claimedUntil: new Date(Date.now() - 1000) } });
      const again = await refund({ strayId: stray.id });

      // Read by its plan, where the whole refund shows: not asked a second time.
      expect(errorOf(again).errorCode).toBe('REFUND_STALE');
      expect(asaas.refunded).toEqual([{ target: { id: 'pay_a', installmentId: 'ins_segunda' }, valueCents: TOTAL, description: 'Produto com defeito' }]);
      expect((await shop.panelOrder()).payment?.strays).toMatchObject([{ refundableCents: 0, resolvedAt: expect.any(String) }]);
    });

    it('is settled too when the shop refunds it at Asaas itself', async () => {
      await shop.place();
      await shop.cancel();
      asaas.payments[0]!.deleted = false;
      asaas.pay(charge().id);
      await hear('evt_late');
      expect((await shop.panelOrder()).payment?.strays).toMatchObject([{ reason: 'ORDER_CANCELLED', resolvedAt: null }]);

      asaas.refundOutside(charge().id, TOTAL);
      await hear('evt_refunded', 'PAYMENT_REFUNDED');

      const payment = (await shop.panelOrder()).payment!;
      expect(payment).toMatchObject({ status: 'REFUNDED', refundedCents: TOTAL });
      expect(payment.strays).toMatchObject([{ resolvedAt: expect.any(String), refundableCents: 0 }]);
      expect(await numbers('payment=STRAY')).toEqual([]);
    });
  });

  describe('the customer', () => {
    it('gets one e-mail and one line a refund, whatever tells of it again', async () => {
      await paid();
      await refund({ amountCents: 1990 });
      await mailer.flush();

      const mail = await waitForMessage(shop.shopper.user.email, 10_000, 'estorno');
      expect(mail.Subject).toBe('lessari — estorno do pagamento do pedido nº 1');
      expect(mail.Text).toMatch(/lessari estornou parte do pagamento do seu pedido nº 1: R\$\s19,90 de R\$\s59,90\./);
      expect(mail.Text).toContain('/lessari/conta/pedidos/1');
      expect(mail.Text).not.toContain('defeito');

      await hear('evt_1', 'PAYMENT_PARTIALLY_REFUNDED');
      await hear('evt_2', 'PAYMENT_PARTIALLY_REFUNDED');
      await app.get(PaymentReconciliation).checkDue(new Date(Date.now() + 40 * DAY_MS));
      await mailer.flush();

      expect(sent).toHaveBeenCalledTimes(1);
      expect(await prisma.orderRefundNotice.findMany()).toMatchObject([{ sentAt: expect.any(Date), attempts: 1 }]);
      const lines = (await talk()).messages;
      expect(lines.map((line) => line.kind)).toEqual(['STATUS', 'PAYMENT', 'REFUND']);
      expect(lines[2]).toMatchObject({ kind: 'REFUND', amountCents: 1990, readAt: null });

      // A second refund is other news.
      await refund({ amountCents: 4000, refundableCents: 4000 });
      await mailer.flush();
      expect(sent).toHaveBeenCalledTimes(2);
      expect((await talk()).messages.filter((line) => line.kind === 'REFUND')).toHaveLength(2);
    });

    it('gets no e-mail with order notices turned off, and still reads the line', async () => {
      await paid();
      await prisma.customer.updateMany({ data: { notifyOrders: false } });

      await refund();
      await mailer.flush();

      expect(sent).not.toHaveBeenCalled();
      expect(await prisma.orderRefundNotice.findMany()).toMatchObject([{ sentAt: expect.any(Date), attempts: 0 }]);
      expect((await talk()).messages.map((line) => line.kind)).toContain('REFUND');
    });

    it('reads an order nobody paid in time as cancelled for want of payment', async () => {
      await shop.place();
      await prisma.order.updateMany({ data: { paymentDueAt: new Date(Date.now() - 1000) } });

      expect(await app.get(UnpaidOrders).cancelDue(new Date())).toBe(1);

      expect(await customerOrder()).toMatchObject({ status: 'CANCELLED', cancelledBy: 'SYSTEM' });
    });
  });
});
