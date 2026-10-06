// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import type { MockInstance } from 'vitest';

// Types
import type { ApiErrorBody, RealtimeEvent } from '@harness-monorepo/contracts';

// App
import { AsaasClient, AsaasRefused, AsaasUnreachable } from '../src/modules/integrations/asaas/asaas.client.js';
import { AsaasEvents } from '../src/modules/payment-events/asaas-events.service.js';
import { ASAAS_EVENT_KEEP_MS } from '../src/modules/payment-events/payment-events.constants.js';
import { RealtimePublisher } from '../src/modules/realtime/realtime-publisher.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { createTestApp } from './support/create-test-app.js';
import { FakeAsaas } from './support/fake-asaas.js';
import { clearInbox } from './support/mailpit.js';
import { openOnlineShop, type OnlineShop } from './support/online-shop.js';
import { resetDatabase } from './support/reset-database.js';

describe("a shop's Asaas webhook (BEELINK-206)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let events: AsaasEvents;
  let shop: OnlineShop;
  let told: MockInstance<RealtimePublisher['publish']>;
  const asaas = new FakeAsaas();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(AsaasClient).useValue(asaas));
    prisma = app.get(PrismaService);
    events = app.get(AsaasEvents);
    told = vi.spyOn(app.get(RealtimePublisher), 'publish');
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
  });

  /** The charge the order was placed with, as Asaas holds it. */
  const charge = () => asaas.payments[0]!;
  const paymentNews = () => told.mock.calls.map(([, event]) => event).filter((event): event is Extract<RealtimeEvent, { type: 'order.payment' }> => event.type === 'order.payment');
  const eventRows = () => prisma.asaasEvent.findMany({ orderBy: { createdAt: 'asc' } });
  /** An event as Asaas sends it, with more in it than bee-link reads. */
  const eventOf = (id: string, event: string, payment: object) => ({ id, event, dateCreated: '2026-10-06 10:00:00', account: { id: 'acc-1', ownerId: null }, payment: { object: 'payment', ...payment }, somethingNew: { nested: true } });
  /** Posted, answered, and whatever it led to finished. */
  async function deliver(body: object | string, token?: string) {
    const response = await shop.event(body, token);
    await events.settled();
    return response;
  }

  describe('receiving', () => {
    it('marks the order paid on a valid event, by what the account says, and tells the shop and the customer', async () => {
      await shop.place();
      asaas.pay(charge().id);
      const orderId = await shop.orderId();

      const response = await deliver(eventOf('evt_1', 'PAYMENT_RECEIVED', { id: charge().id, externalReference: orderId, status: 'RECEIVED', value: 59.9 }));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ result: 'RECORDED' });
      const [row] = await shop.rows();
      expect(row).toMatchObject({ status: 'RECEIVED', providerStatus: 'RECEIVED', nextCheckAt: null, pixPayload: null });
      expect(row!.paidAt).toBeInstanceOf(Date);
      expect(await shop.readPayment()).toMatchObject({ status: 'RECEIVED', pix: null });
      expect((await shop.panelOrder()).payment).toMatchObject({ status: 'RECEIVED', strays: [] });

      const customerId = (await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).customerId;
      expect(told).toHaveBeenCalledWith({ storeId: shop.storeId, customerId }, { type: 'order.payment', orderNumber: 1, status: 'RECEIVED', stray: null });
      expect(await eventRows()).toMatchObject([{ storeId: shop.storeId, eventId: 'evt_1', event: 'PAYMENT_RECEIVED', orderId, outcome: 'APPLIED', attempts: 1, lastError: null }]);
    });

    it('never takes the body for the fact: an event that says paid of a charge the account holds waiting changes nothing', async () => {
      await shop.place();

      const response = await deliver(eventOf('evt_forged', 'PAYMENT_RECEIVED', { id: charge().id, status: 'RECEIVED' }));

      expect(response.json()).toEqual({ result: 'RECORDED' });
      expect(await shop.rows()).toMatchObject([{ status: 'PENDING', paidAt: null }]);
      expect(paymentNews()).toEqual([]);
    });

    it('answers a second delivery of the same event with 200 and does nothing', async () => {
      await shop.place();
      asaas.pay(charge().id);
      const body = eventOf('evt_1', 'PAYMENT_RECEIVED', { id: charge().id });
      await deliver(body);
      const asked = asaas.count('charges');

      const again = await deliver(body);

      expect(again.statusCode).toBe(200);
      expect(again.json()).toEqual({ result: 'DUPLICATE' });
      expect(asaas.count('charges')).toBe(asked);
      expect(await eventRows()).toHaveLength(1);
      expect(paymentNews()).toHaveLength(1);
      expect(await shop.rows()).toHaveLength(1);
    });

    it("refuses a request without a shop's token, and writes nothing", async () => {
      await shop.place();
      asaas.pay(charge().id);
      const body = eventOf('evt_1', 'PAYMENT_RECEIVED', { id: charge().id });

      for (const token of ['x'.repeat(43), 'short', `${await shop.webhookToken()}x`]) {
        const response = await deliver(body, token);
        expect(response.statusCode).toBe(401);
        expect(response.json<ApiErrorBody>().errorCode).toBe('INTEGRATION_SIGNATURE_INVALID');
      }
      const none = await app.inject({ method: 'POST', url: '/api/integrations/asaas/webhook', payload: body });
      expect(none.statusCode).toBe(401);

      expect(await eventRows()).toEqual([]);
      expect(await shop.rows()).toMatchObject([{ status: 'PENDING' }]);
    });

    it("leaves another shop's charge alone: a token opens its own shop only", async () => {
      await shop.place();
      asaas.pay(charge().id);
      const other = await openOnlineShop(app, prisma, 'outra');

      const response = await deliver(eventOf('evt_1', 'PAYMENT_RECEIVED', { id: charge().id, externalReference: await shop.orderId() }), await other.webhookToken());

      expect(response.json()).toEqual({ result: 'IGNORED' });
      expect(await shop.rows()).toMatchObject([{ status: 'PENDING' }]);
      expect(await eventRows()).toMatchObject([{ storeId: other.storeId, orderId: null, outcome: 'IGNORED' }]);
    });

    it('recognizes a charge the shop made outside bee-link and leaves it, keeping the least', async () => {
      const asked = asaas.calls.length;

      const response = await deliver(eventOf('evt_fora', 'PAYMENT_RECEIVED', { id: 'pay_da_loja', externalReference: 'pedido-4521', customer: 'cus_x', value: 300 }));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ result: 'IGNORED' });
      const [row] = await eventRows();
      expect(row).toMatchObject({ eventId: 'evt_fora', event: 'PAYMENT_RECEIVED', orderId: null, outcome: 'IGNORED', attempts: 0 });
      expect(row!.processedAt).toBeInstanceOf(Date);
      expect(asaas.calls).toHaveLength(asked);
    });

    it('does not break on a body it cannot make sense of, and tells a second delivery of one without an id by its bytes', async () => {
      for (const body of ['{}', '[]', '{"event":"PAYMENT_RECEIVED"}', '{"id":17,"event":null,"payment":"pay_1"}', '{"id":"evt_x","event":"SOMETHING_ASAAS_ADDED","payment":{"id":{"deep":1}}}']) {
        const response = await deliver(body);
        expect([body, response.statusCode, response.json()]).toEqual([body, 200, { result: 'IGNORED' }]);
      }
      expect((await deliver('{"event":"PAYMENT_RECEIVED"}')).json()).toEqual({ result: 'DUPLICATE' });
      expect(await eventRows()).toHaveLength(5);
    });
  });

  describe('what an event leads to', () => {
    it('does not take a paid charge back on an overdue that arrives late — nor on Asaas itself saying so', async () => {
      await shop.place();
      asaas.pay(charge().id);
      await deliver(eventOf('evt_1', 'PAYMENT_RECEIVED', { id: charge().id }));

      await deliver(eventOf('evt_0', 'PAYMENT_OVERDUE', { id: charge().id, status: 'OVERDUE' }));
      expect(await shop.rows()).toMatchObject([{ status: 'RECEIVED' }]);

      asaas.pay(charge().id, 'OVERDUE');
      await deliver(eventOf('evt_00', 'PAYMENT_OVERDUE', { id: charge().id, status: 'OVERDUE' }));
      expect(await shop.rows()).toMatchObject([{ status: 'RECEIVED', providerStatus: 'OVERDUE' }]);
      expect(paymentNews()).toHaveLength(1);
    });

    it('reads a plan as one payment: an event about another instalment marks the order paid', async () => {
      await shop.place({ paymentMethod: 'CREDIT_CARD', installments: 3 });
      const [first, second] = asaas.payments;
      asaas.pay(second!.id, 'CONFIRMED');

      // Nothing in it but the instalment's own id and its plan: bee-link keeps the first instalment's.
      await deliver(eventOf('evt_p2', 'PAYMENT_CONFIRMED', { id: second!.id, installment: second!.installmentId, installmentNumber: 2 }));

      expect(await shop.rows()).toMatchObject([{ status: 'CONFIRMED', providerId: first!.id, providerInstallmentId: first!.installmentId, installments: 3, amountCents: 5990 }]);
      expect(paymentNews()).toEqual([{ type: 'order.payment', orderNumber: 1, status: 'CONFIRMED', stray: null }]);
    });

    it('answers 200 when the work fails, and tries it again later', async () => {
      await shop.place();
      asaas.pay(charge().id);
      asaas.failing('charges', new AsaasUnreachable('Asaas failed (503)'));

      const response = await deliver(eventOf('evt_1', 'PAYMENT_RECEIVED', { id: charge().id }));

      expect(response.statusCode).toBe(200);
      expect(await shop.rows()).toMatchObject([{ status: 'PENDING' }]);
      const [waiting] = await eventRows();
      expect(waiting).toMatchObject({ attempts: 1, processedAt: null, outcome: null, lastError: 'Asaas failed (503)' });
      expect(waiting!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 30_000);
      // Not due yet: a sweep leaves it.
      expect(await events.flush()).toBe(0);

      await prisma.asaasEvent.updateMany({ data: { nextAttemptAt: new Date(Date.now() - 1000) } });
      expect(await events.flush()).toBe(1);
      expect(await shop.rows()).toMatchObject([{ status: 'RECEIVED' }]);
      expect(await eventRows()).toMatchObject([{ attempts: 2, outcome: 'APPLIED', lastError: null }]);
    });

    it('gives an event up after its last try, without losing the charge for the reconciliation', async () => {
      await shop.place();
      await prisma.asaasEvent.create({ data: { storeId: shop.storeId, eventId: 'evt_velho', event: 'PAYMENT_RECEIVED', orderId: await shop.orderId(), attempts: 7 } });
      asaas.failing('charges', new AsaasUnreachable('Asaas failed (503)'));

      expect(await events.flush()).toBe(0);

      expect(await eventRows()).toMatchObject([{ attempts: 8, outcome: 'GIVEN_UP' }]);
      const [row] = await shop.rows();
      expect(row).toMatchObject({ status: 'PENDING' });
      expect(row!.nextCheckAt).toBeInstanceOf(Date);
    });

    it('cancels the charge here when it was removed at Asaas', async () => {
      await shop.place();
      charge().deleted = true;

      await deliver(eventOf('evt_del', 'PAYMENT_DELETED', { id: charge().id, deleted: true }));

      expect(await shop.rows()).toMatchObject([{ status: 'CANCELLED', nextCheckAt: null }]);
      expect(paymentNews()).toEqual([{ type: 'order.payment', orderNumber: 1, status: 'CANCELLED', stray: null }]);
    });

    it('follows an amount or a due day the shop changed at Asaas, and drops the Pix code that went with the old one', async () => {
      await shop.place();
      expect(await shop.readPayment()).toMatchObject({ pix: { payload: expect.any(String) } });
      charge().dueDate = '2026-12-24';

      await deliver(eventOf('evt_upd', 'PAYMENT_UPDATED', { id: charge().id }));

      const [row] = await shop.rows();
      expect(row).toMatchObject({ status: 'PENDING', pixPayload: null });
      expect(row!.expiresAt?.toISOString()).toBe('2026-12-25T02:59:59.999Z');
    });

    it('takes a receipt in cash for paid, and takes it back when the shop undoes it at Asaas', async () => {
      await shop.place();
      asaas.pay(charge().id, 'RECEIVED_IN_CASH');
      await deliver(eventOf('evt_cash', 'PAYMENT_RECEIVED', { id: charge().id }));
      expect(await shop.rows()).toMatchObject([{ status: 'RECEIVED', providerStatus: 'RECEIVED_IN_CASH' }]);

      asaas.pay(charge().id, 'PENDING');
      await deliver(eventOf('evt_undone', 'PAYMENT_RECEIVED_IN_CASH_UNDONE', { id: charge().id }));

      expect(await shop.rows()).toMatchObject([{ status: 'PENDING', paidAt: null }]);
    });

    it('keeps a refund and a chargeback as far as this ticket goes: refunded is said, a dispute leaves the money held', async () => {
      await shop.place();
      asaas.pay(charge().id, 'CONFIRMED');
      await deliver(eventOf('evt_1', 'PAYMENT_CONFIRMED', { id: charge().id }));

      asaas.pay(charge().id, 'CHARGEBACK_REQUESTED');
      await deliver(eventOf('evt_2', 'PAYMENT_CHARGEBACK_REQUESTED', { id: charge().id }));
      expect(await shop.rows()).toMatchObject([{ status: 'CONFIRMED', providerStatus: 'CHARGEBACK_REQUESTED' }]);

      asaas.pay(charge().id, 'REFUNDED');
      await deliver(eventOf('evt_3', 'PAYMENT_REFUNDED', { id: charge().id }));
      expect(await shop.rows()).toMatchObject([{ status: 'REFUNDED', refundedCents: 0 }]);
    });
  });

  describe('money the order did not ask for', () => {
    /** The order cancelled with Asaas not answering: its charge is still payable there. */
    async function cancelledWithItsChargeStanding() {
      await shop.place();
      asaas.failing('charges', new AsaasUnreachable('Asaas failed (503)'));
      asaas.failing('charges', new AsaasUnreachable('Asaas failed (503)'));
      expect((await shop.cancel()).statusCode).toBe(200);
      expect(asaas.standing).toHaveLength(1);
      told.mockClear();
    }

    it('keeps a payment that arrives for a cancelled order, shows it on the order in the panel, and tells the shop once', async () => {
      await cancelledWithItsChargeStanding();
      asaas.pay(charge().id);

      await deliver(eventOf('evt_1', 'PAYMENT_RECEIVED', { id: charge().id }));

      const order = await shop.panelOrder();
      expect(order.status).toBe('CANCELLED');
      expect(order.payment).toMatchObject({ status: 'RECEIVED', strays: [{ reason: 'ORDER_CANCELLED', method: 'PIX', amountCents: 5990, paidAt: expect.any(String) }] });
      expect(paymentNews()).toEqual([{ type: 'order.payment', orderNumber: 1, status: 'RECEIVED', stray: 'ORDER_CANCELLED' }]);
      // Nothing is refunded by bee-link: the charge stands paid at the shop's account.
      expect(charge()).toMatchObject({ status: 'RECEIVED', deleted: false });

      await deliver(eventOf('evt_2', 'PAYMENT_RECEIVED', { id: charge().id }));
      expect(await prisma.orderStrayPayment.count()).toBe(1);
      expect(paymentNews()).toHaveLength(1);
    });

    it('keeps a second payment of an order already paid, beside the first', async () => {
      await shop.place();
      asaas.pay(charge().id);
      await deliver(eventOf('evt_1', 'PAYMENT_RECEIVED', { id: charge().id }));
      // A second charge of the same order, paid: one restored at Asaas's panel, or left by a process that died.
      asaas.payments.push({ ...charge(), id: 'pay_segunda', status: 'RECEIVED' });
      told.mockClear();

      await deliver(eventOf('evt_2', 'PAYMENT_RECEIVED', { id: 'pay_segunda', externalReference: await shop.orderId() }));

      expect(await shop.rows()).toMatchObject([{ status: 'RECEIVED', providerId: charge().id }]);
      expect((await shop.panelOrder()).payment?.strays).toMatchObject([{ reason: 'ORDER_ALREADY_PAID', amountCents: 5990 }]);
      expect(await prisma.orderStrayPayment.findMany()).toMatchObject([{ providerId: 'pay_segunda', storeId: shop.storeId }]);
      expect(paymentNews()).toEqual([{ type: 'order.payment', orderNumber: 1, status: 'RECEIVED', stray: 'ORDER_ALREADY_PAID' }]);
    });

    it('takes a charge still waiting out of Asaas once another of the same order is paid', async () => {
      await shop.place();
      asaas.payments.push({ ...charge(), id: 'pay_outra', status: 'RECEIVED' });

      await deliver(eventOf('evt_1', 'PAYMENT_RECEIVED', { id: 'pay_outra', externalReference: await shop.orderId() }));

      expect(charge().deleted).toBe(true);
      const rows = await shop.rows();
      expect(rows.map((row) => [row.providerId, row.status]).sort()).toEqual([[charge().id, 'CANCELLED'], ['pay_outra', 'RECEIVED']].sort());
    });
  });

  describe("news of the account's keys", () => {
    const keyEvent = (id: string, event: string) => ({ id, event, dateCreated: '2026-10-06 10:00:00', account: { id: 'acc-1', ownerId: null }, accessToken: { id: 'cf7662a4', name: 'Chave', enabled: false, disableReason: 'MANUAL' } });
    const connection = () => prisma.storeIntegration.findFirstOrThrow({ where: { storeId: shop.storeId, provider: 'ASAAS' } });

    it("marks the connection to be reconnected when the key that stopped working is the shop's", async () => {
      asaas.keyError = new AsaasRefused(401, 'invalid_access_token', 'A chave de API fornecida é inválida');

      const response = await deliver(keyEvent('evt_k1', 'ACCESS_TOKEN_DISABLED'));

      expect(response.json()).toEqual({ result: 'RECORDED' });
      expect(await connection()).toMatchObject({ status: 'NEEDS_RECONNECT' });
      expect(await eventRows()).toMatchObject([{ event: 'ACCESS_TOKEN_DISABLED', orderId: null, outcome: 'APPLIED' }]);
    });

    it('leaves the connection as it is when the key was another of the account', async () => {
      await deliver(keyEvent('evt_k2', 'ACCESS_TOKEN_DELETED'));

      expect(asaas.keeping).toContain('account');
      expect(await connection()).toMatchObject({ status: 'CONNECTED' });
    });

    it("still records the events of a shop whose key stopped working, and reads them once it is good again", async () => {
      await shop.place();
      asaas.pay(charge().id);
      await prisma.storeIntegration.updateMany({ data: { status: 'NEEDS_RECONNECT' } });

      const response = await deliver(eventOf('evt_1', 'PAYMENT_RECEIVED', { id: charge().id }));
      expect(response.json()).toEqual({ result: 'RECORDED' });
      expect(await shop.rows()).toMatchObject([{ status: 'PENDING' }]);

      await prisma.storeIntegration.updateMany({ data: { status: 'CONNECTED' } });
      await prisma.asaasEvent.updateMany({ data: { nextAttemptAt: new Date(Date.now() - 1000) } });
      expect(await events.flush()).toBe(1);
      expect(await shop.rows()).toMatchObject([{ status: 'RECEIVED' }]);
    });
  });

  it('prunes the events done a month ago, and none still waiting', async () => {
    const old = new Date(Date.now() - ASAAS_EVENT_KEEP_MS - 60_000);
    await prisma.asaasEvent.createMany({
      data: [
        { storeId: shop.storeId, eventId: 'evt_antigo', event: 'PAYMENT_RECEIVED', outcome: 'APPLIED', processedAt: old, createdAt: old },
        { storeId: shop.storeId, eventId: 'evt_recente', event: 'PAYMENT_RECEIVED', outcome: 'IGNORED', processedAt: new Date(), createdAt: old },
        { storeId: shop.storeId, eventId: 'evt_esperando', event: 'PAYMENT_RECEIVED', createdAt: old, nextAttemptAt: new Date(Date.now() + 3_600_000) },
      ],
    });

    expect(await events.prune(new Date())).toBe(1);
    expect((await eventRows()).map((row) => row.eventId).sort()).toEqual(['evt_esperando', 'evt_recente']);
  });
});
