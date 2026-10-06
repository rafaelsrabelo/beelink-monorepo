// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import type { MockInstance } from 'vitest';

// Types
import type { RealtimeEvent } from '@harness-monorepo/contracts';

// App
import { AsaasClient, AsaasRefused, AsaasThrottled, AsaasUnreachable } from '../src/modules/integrations/asaas/asaas.client.js';
import { AsaasWebhookKeeper } from '../src/modules/integrations/asaas/asaas-webhook-keeper.js';
import { PaymentReconciliation } from '../src/modules/payment-events/payment-reconciliation.js';
import { UnpaidOrders } from '../src/modules/payment-events/unpaid-orders.js';
import { FIRST_CHECK_MS, READ_CHECK_EVERY_MS } from '../src/modules/payments/payment-checks.js';
import { PAYMENT_WAIT_MS } from '../src/modules/payments/payments.constants.js';
import { RealtimePublisher } from '../src/modules/realtime/realtime-publisher.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { createTestApp } from './support/create-test-app.js';
import { FakeAsaas } from './support/fake-asaas.js';
import { clearInbox, waitForMessage } from './support/mailpit.js';
import { openOnlineShop, type OnlineShop } from './support/online-shop.js';
import { resetDatabase } from './support/reset-database.js';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const home = { zipCode: '30140-071', street: 'Rua da Bahia', number: '1148', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG' };
/** The shop's own delivery with no band: its fee is agreed after the order. */
const feeAgreedLater = { pickupEnabled: true, ownDeliveryEnabled: true, bands: [], freeAboveCents: null, carriersEnabled: false };

describe('what the clock does about an online payment (BEELINK-206)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let reconciliation: PaymentReconciliation;
  let unpaid: UnpaidOrders;
  let keeper: AsaasWebhookKeeper;
  let shop: OnlineShop;
  let told: MockInstance<RealtimePublisher['publish']>;
  const asaas = new FakeAsaas();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(AsaasClient).useValue(asaas));
    prisma = app.get(PrismaService);
    reconciliation = app.get(PaymentReconciliation);
    unpaid = app.get(UnpaidOrders);
    keeper = app.get(AsaasWebhookKeeper);
    told = vi.spyOn(app.get(RealtimePublisher), 'publish');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    asaas.reset();
    shop = await openOnlineShop(app, prisma, 'lessari');
    told.mockClear();
  });

  const charge = () => asaas.payments[0]!;
  const paymentNews = () => told.mock.calls.map(([, event]) => event).filter((event): event is Extract<RealtimeEvent, { type: 'order.payment' }> => event.type === 'order.payment');
  const later = (ms: number) => new Date(Date.now() + ms);
  const order = (number = 1) => prisma.order.findFirstOrThrow({ where: { storeId: shop.storeId, number }, include: { events: { orderBy: { createdAt: 'asc' } } } });
  const unreachable = () => new AsaasUnreachable('Asaas failed (503)');

  describe('the reconciliation', () => {
    it('finds a payment the webhook missed, and tells of it as the webhook would', async () => {
      await shop.place();
      asaas.pay(charge().id);

      // A charge made a moment ago is not asked about yet: the webhook is the fast way.
      expect(await reconciliation.checkDue(new Date())).toBe(0);
      expect(await shop.rows()).toMatchObject([{ status: 'PENDING' }]);

      expect(await reconciliation.checkDue(later(FIRST_CHECK_MS + MINUTE_MS))).toBe(1);

      expect(await shop.rows()).toMatchObject([{ status: 'RECEIVED', nextCheckAt: null }]);
      expect(paymentNews()).toEqual([{ type: 'order.payment', orderNumber: 1, status: 'RECEIVED', stray: null }]);
      // Paid: nothing is left to ask.
      expect(await reconciliation.checkDue(later(48 * HOUR_MS))).toBe(0);
    });

    it('asks about a charge less and less often, the oldest first, and marks one past its day overdue', async () => {
      await shop.place();
      await shop.place();
      const [older, newer] = await shop.rows();
      const asked: string[] = [];
      asaas.before('charges', () => void asked.push('charges'));
      const first = later(FIRST_CHECK_MS + MINUTE_MS);
      asaas.payments[0]!.status = 'OVERDUE';
      const before = asaas.count('charges');

      expect(await reconciliation.checkDue(first)).toBe(2);

      expect(asaas.count('charges') - before).toBe(2);
      const rows = await shop.rows();
      expect(rows).toMatchObject([{ id: older!.id, status: 'OVERDUE', checks: 1 }, { id: newer!.id, status: 'PENDING', checks: 1 }]);
      expect(rows[0]!.nextCheckAt?.getTime()).toBe(first.getTime() + 2 * FIRST_CHECK_MS);
      // Not due again until then.
      expect(await reconciliation.checkDue(new Date(first.getTime() + FIRST_CHECK_MS))).toBe(0);
      expect(await reconciliation.checkDue(new Date(first.getTime() + 2 * FIRST_CHECK_MS))).toBe(2);
      expect((await shop.rows())[0]!.nextCheckAt?.getTime()).toBe(first.getTime() + 2 * FIRST_CHECK_MS + 4 * FIRST_CHECK_MS);
    });

    it('leaves a shop Asaas asked to wait for until the time it named, and still asks the others', async () => {
      await shop.place();
      await shop.place();
      const other = await openOnlineShop(app, prisma, 'outra');
      await other.place();
      asaas.pay(asaas.payments[2]!.id);
      const now = later(FIRST_CHECK_MS + MINUTE_MS);
      const wait = new Date(now.getTime() + 2 * HOUR_MS);
      asaas.failing('charges', new AsaasThrottled('Asaas failed (429)', wait));
      const before = asaas.count('charges');

      expect(await reconciliation.checkDue(now)).toBe(2);

      // The first shop was asked once and refused; its second charge was not asked about at all.
      expect(asaas.count('charges') - before).toBe(2);
      expect(await other.rows()).toMatchObject([{ status: 'RECEIVED' }]);
      for (const row of await shop.rows()) expect(row).toMatchObject({ status: 'PENDING', nextCheckAt: wait });
      // Nor is the account asked by anybody else before that time.
      const quiet = asaas.count('charges');
      expect(await reconciliation.checkDue(new Date(wait.getTime() - MINUTE_MS))).toBe(0);
      expect(asaas.count('charges')).toBe(quiet);
    });

    it("goes on to the next shop when one's key does not open", async () => {
      await shop.place();
      const other = await openOnlineShop(app, prisma, 'outra');
      await other.place();
      asaas.pay(asaas.payments[1]!.id);
      asaas.failing('charges', new AsaasRefused(401, 'invalid_access_token', 'A chave de API fornecida é inválida'));

      await reconciliation.checkDue(later(FIRST_CHECK_MS + MINUTE_MS));

      expect(await prisma.storeIntegration.findFirstOrThrow({ where: { storeId: shop.storeId } })).toMatchObject({ status: 'NEEDS_RECONNECT' });
      expect(await other.rows()).toMatchObject([{ status: 'RECEIVED' }]);
      // A shop to be reconnected is not asked again until it is.
      const before = asaas.count('charges');
      await reconciliation.checkDue(later(48 * HOUR_MS));
      expect(asaas.count('charges')).toBe(before);
    });

    it('removes, at last, the charge of a cancelled order that Asaas did not remove when it was cancelled', async () => {
      await shop.place();
      asaas.failing('deleteCharge', unreachable());
      await shop.cancel();
      expect(asaas.standing).toHaveLength(1);
      expect(await shop.rows()).toMatchObject([{ status: 'PENDING', lastError: 'Asaas failed (503)' }]);

      await reconciliation.checkDue(later(FIRST_CHECK_MS + MINUTE_MS));

      expect(asaas.standing).toHaveLength(0);
      expect(await shop.rows()).toMatchObject([{ status: 'CANCELLED' }]);
    });

    it('removes the charge of a total that changed since, when Asaas did not remove it then', async () => {
      await shop.call('PUT', '/api/stores/lessari/delivery', shop.owner, feeAgreedLater);
      await shop.call('POST', '/api/stores/lessari/customer/addresses', shop.shopper, home);
      await shop.place({ fulfillment: 'DELIVERY' });
      await shop.call('PUT', '/api/stores/lessari/orders/1/delivery-fee', shop.owner, { deliveryFeeCents: 1000 });
      await shop.call('POST', '/api/stores/lessari/customer/orders/1/payment', shop.shopper);
      expect(await shop.rows()).toMatchObject([{ status: 'PENDING', amountCents: 6990 }]);
      asaas.failing('deleteCharge', unreachable());
      await shop.call('PUT', '/api/stores/lessari/orders/1/delivery-fee', shop.owner, { deliveryFeeCents: 2000 });
      expect(asaas.standing).toHaveLength(1);

      await reconciliation.checkDue(later(FIRST_CHECK_MS + MINUTE_MS));

      expect(asaas.standing).toHaveLength(0);
      expect(await shop.rows()).toMatchObject([{ status: 'CANCELLED' }]);
    });
  });

  describe("a customer's read of a waiting charge", () => {
    it('asks Asaas at most once a minute a charge, counted from the last time it was heard about', async () => {
      await shop.place();
      asaas.pay(charge().id);
      const made = asaas.count('charges');

      // Heard about a moment ago, when it was made: the read answers what bee-link knows.
      expect(await shop.readPayment()).toMatchObject({ status: 'PENDING' });
      expect(await shop.readPayment()).toMatchObject({ status: 'PENDING' });
      expect(asaas.count('charges')).toBe(made);

      await prisma.orderPayment.updateMany({ data: { checkedAt: new Date(Date.now() - READ_CHECK_EVERY_MS - 1000) } });
      expect(await shop.readPayment()).toMatchObject({ status: 'RECEIVED', pix: null });
      expect(asaas.count('charges')).toBe(made + 1);
      expect(paymentNews()).toEqual([{ type: 'order.payment', orderNumber: 1, status: 'RECEIVED', stray: null }]);
    });

    it('asks once for every read made in the same minute, and answers though Asaas does not', async () => {
      await shop.place();
      await prisma.orderPayment.updateMany({ data: { checkedAt: new Date(Date.now() - READ_CHECK_EVERY_MS - 1000) } });
      const made = asaas.count('charges');

      const reads = await Promise.all([shop.readPayment(), shop.readPayment(), shop.readPayment()]);
      expect(reads.map((read) => read?.status)).toEqual(['PENDING', 'PENDING', 'PENDING']);
      expect(await shop.readPayment()).toMatchObject({ status: 'PENDING' });
      expect(asaas.count('charges')).toBe(made + 1);

      await prisma.orderPayment.updateMany({ data: { checkedAt: new Date(Date.now() - READ_CHECK_EVERY_MS - 1000) } });
      asaas.failing('charges', unreachable());
      expect(await shop.readPayment()).toMatchObject({ status: 'PENDING' });
    });
  });

  describe('an order nobody paid', () => {
    const past = () => later(PAYMENT_WAIT_MS + MINUTE_MS);

    it('is cancelled three days after its total closed, once Asaas was heard to hold no payment — in the system’s name, with what a cancellation gives back', async () => {
      await prisma.productVariant.update({ where: { id: shop.variantId }, data: { trackStock: true, stockQuantity: 5 } });
      const placed = await shop.place();
      const due = (await order()).paymentDueAt!;
      expect(Math.abs(due.getTime() - (new Date(placed.placedAt).getTime() + PAYMENT_WAIT_MS))).toBeLessThan(MINUTE_MS);
      expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: shop.variantId } })).stockQuantity).toBe(4);
      await clearInbox();

      // Not yet.
      expect(await unpaid.cancelDue(later(PAYMENT_WAIT_MS - HOUR_MS))).toBe(0);
      expect((await order()).status).toBe('RECEIVED');

      const before = asaas.count('charges');
      expect(await unpaid.cancelDue(past())).toBe(1);

      const cancelled = await order();
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.events.at(-1)).toMatchObject({ status: 'CANCELLED', actor: 'SYSTEM', userId: null });
      expect(asaas.count('charges')).toBeGreaterThan(before);
      expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: shop.variantId } })).stockQuantity).toBe(5);
      // Its charge can no longer be paid.
      expect(asaas.standing).toHaveLength(0);
      expect(await shop.rows()).toMatchObject([{ status: 'CANCELLED' }]);
      // Told in the conversation, as news, and by e-mail.
      const messages = await prisma.orderMessage.findMany({ where: { conversation: { orderId: cancelled.id } }, orderBy: { createdAt: 'asc' } });
      expect(messages.at(-1)).toMatchObject({ author: 'SYSTEM', status: 'CANCELLED', readAt: null });
      expect((await waitForMessage(shop.shopper.user.email)).Subject).toMatch(/cancel/i);
      expect(told).toHaveBeenCalledWith(expect.objectContaining({ storeId: shop.storeId }), { type: 'order.status', orderNumber: 1, status: 'CANCELLED' });

      // Once: a second pass finds nothing.
      expect(await unpaid.cancelDue(past())).toBe(0);
    });

    it('is not cancelled when the check at Asaas finds it paid: it becomes paid instead', async () => {
      await shop.place();
      asaas.pay(charge().id);

      expect(await unpaid.cancelDue(past())).toBe(0);

      expect((await order()).status).toBe('RECEIVED');
      expect(await shop.rows()).toMatchObject([{ status: 'RECEIVED' }]);
      expect(paymentNews()).toEqual([{ type: 'order.payment', orderNumber: 1, status: 'RECEIVED', stray: null }]);
    });

    it('is not cancelled while Asaas cannot be asked, and is looked at again later', async () => {
      await shop.place();
      const now = past();

      asaas.failing('charges', unreachable());
      expect(await unpaid.cancelDue(now)).toBe(0);
      expect((await order()).status).toBe('RECEIVED');
      expect((await order()).paymentDueAt?.getTime()).toBe(now.getTime() + HOUR_MS);
      expect(await unpaid.cancelDue(new Date(now.getTime() + 30 * MINUTE_MS))).toBe(0);

      // Nor with the shop's key refused: nobody could see a payment.
      await prisma.storeIntegration.updateMany({ data: { status: 'NEEDS_RECONNECT' } });
      expect(await unpaid.cancelDue(new Date(now.getTime() + 2 * HOUR_MS))).toBe(0);
      expect((await order()).status).toBe('RECEIVED');

      await prisma.storeIntegration.updateMany({ data: { status: 'CONNECTED' } });
      expect(await unpaid.cancelDue(new Date(now.getTime() + 4 * HOUR_MS))).toBe(1);
    });

    it('is not cancelled while its card is under Asaas’s review, nor while its charge stands at an account the shop left', async () => {
      await shop.place({ paymentMethod: 'CREDIT_CARD' });
      charge().status = 'AWAITING_RISK_ANALYSIS';
      expect(await unpaid.cancelDue(past())).toBe(0);
      expect((await order()).status).toBe('RECEIVED');

      // Another account connected, and the charge left behind at the first: the key in hand finds nothing.
      charge().status = 'PENDING';
      asaas.failing('deleteCharge', unreachable());
      asaas.accountInfo = { name: 'Outra Conta', document: '98765432000110' };
      await shop.connect();
      const left = asaas.payments.splice(0);
      await prisma.order.updateMany({ data: { paymentDueAt: new Date() } });

      expect(await unpaid.cancelDue(past())).toBe(0);
      expect((await order()).status).toBe('RECEIVED');
      // Nor is its row written as gone: it may be paid there.
      expect(await shop.rows()).toMatchObject([{ status: 'PENDING', providerId: left[0]!.id }]);
    });

    it('is cancelled though the shop accepted it, and left to the shop once it is out for delivery', async () => {
      await shop.place();
      await shop.place();
      await shop.call('PATCH', '/api/stores/lessari/orders/1/status', shop.owner, { status: 'ACCEPTED' });
      await shop.call('PATCH', '/api/stores/lessari/orders/2/status', shop.owner, { status: 'OUT_FOR_DELIVERY' });

      expect(await unpaid.cancelDue(past())).toBe(1);

      expect((await order(1)).status).toBe('CANCELLED');
      expect((await order(2)).status).toBe('OUT_FOR_DELIVERY');
    });

    it('waits for a total that is not closed, and gives three days from when the shop closes it', async () => {
      await shop.call('PUT', '/api/stores/lessari/delivery', shop.owner, feeAgreedLater);
      await shop.call('POST', '/api/stores/lessari/customer/addresses', shop.shopper, home);
      await shop.place({ fulfillment: 'DELIVERY' });
      expect((await order()).paymentDueAt).toBeNull();
      expect(await unpaid.cancelDue(later(30 * 24 * HOUR_MS))).toBe(0);

      await prisma.order.updateMany({ data: { createdAt: new Date(Date.now() - 10 * 24 * HOUR_MS) } });
      await shop.call('PUT', '/api/stores/lessari/orders/1/delivery-fee', shop.owner, { deliveryFeeCents: 1000 });

      const due = (await order()).paymentDueAt!;
      expect(Math.abs(due.getTime() - (Date.now() + PAYMENT_WAIT_MS))).toBeLessThan(MINUTE_MS);
      expect(await unpaid.cancelDue(later(PAYMENT_WAIT_MS - HOUR_MS))).toBe(0);
      expect(await unpaid.cancelDue(past())).toBe(1);
    });

    it('never touches an order settled with the shop', async () => {
      await shop.call('POST', '/api/stores/lessari/customer/orders', shop.shopper, { items: [{ variantId: shop.variantId, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' });
      expect((await order()).paymentDueAt).toBeNull();

      expect(await unpaid.cancelDue(later(30 * 24 * HOUR_MS))).toBe(0);
      expect((await order()).status).toBe('RECEIVED');
    });
  });

  describe("a key about to leave", () => {
    it('takes the waiting charges out of the account when the shop disconnects, and writes as paid one that was', async () => {
      await shop.place();
      await shop.place();
      asaas.pay(asaas.payments[1]!.id);

      expect((await shop.call('DELETE', '/api/stores/lessari/integrations/asaas', shop.owner)).statusCode).toBe(204);

      expect(asaas.payments.map((payment) => payment.deleted)).toEqual([true, false]);
      expect(await shop.rows()).toMatchObject([{ status: 'CANCELLED' }, { status: 'RECEIVED' }]);
      expect(await prisma.storeIntegration.count()).toBe(0);
    });

    it('disconnects all the same when Asaas does not answer', async () => {
      await shop.place();
      asaas.failing('deleteCharge', unreachable());

      expect((await shop.call('DELETE', '/api/stores/lessari/integrations/asaas', shop.owner)).statusCode).toBe(204);

      expect(await prisma.storeIntegration.count()).toBe(0);
      expect(await shop.rows()).toMatchObject([{ status: 'PENDING' }]);
    });

    it('takes them out when another account is connected, and keeps them when it is the same account under a new key', async () => {
      await shop.place();

      await shop.connect();
      expect(asaas.standing).toHaveLength(1);
      expect(await shop.rows()).toMatchObject([{ status: 'PENDING' }]);

      asaas.accountInfo = { name: 'Outra Conta', document: '98765432000110' };
      await shop.connect();
      expect(asaas.standing).toHaveLength(0);
      expect(await shop.rows()).toMatchObject([{ status: 'CANCELLED' }]);
    });
  });

  describe("the shop's webhook and key, looked at once a day", () => {
    const connection = () => prisma.storeIntegration.findFirstOrThrow({ where: { storeId: shop.storeId, provider: 'ASAAS' } });

    it('uses the key though no webhook is registered here, and not again the same day', async () => {
      asaas.keeping.length = 0;
      const now = new Date();

      expect(await keeper.checkDue(now)).toBe(1);

      expect(asaas.keeping).toEqual(['account']);
      expect(await connection()).toMatchObject({ status: 'CONNECTED', webhookState: 'SKIPPED', webhookCheckedAt: now });
      expect(await keeper.checkDue(new Date(now.getTime() + 23 * HOUR_MS))).toBe(0);
      expect(await keeper.checkDue(new Date(now.getTime() + 25 * HOUR_MS))).toBe(1);
    });

    it('marks the connection to be reconnected when Asaas refuses the key', async () => {
      asaas.keyError = new AsaasRefused(401, 'invalid_access_token', 'A chave de API fornecida é inválida');

      await keeper.checkDue(new Date());

      expect(await connection()).toMatchObject({ status: 'NEEDS_RECONNECT' });
      asaas.keyError = null;
      // Nothing is asked of a key that does not open.
      expect(await keeper.checkDue(later(48 * HOUR_MS))).toBe(0);
    });
  });
});
