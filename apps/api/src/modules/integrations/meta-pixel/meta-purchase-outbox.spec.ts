// Types
import type { Prisma } from '../../../generated/prisma/client.js';

// App
import { META_EVENT_MAX_AGE_MS, META_PURCHASE_RETRY_MAX_MS, owePurchase, purchaseRetryAtOf, tooOldToSend } from './meta-purchase-outbox.js';

const NOW = new Date('2026-10-06T12:00:00.000Z');
const MINUTE = 60_000;

describe('when a purchase that failed is tried again', () => {
  it('waits 1, 2, 4, 8… minutes, each less and less often', () => {
    expect([1, 2, 3, 4, 5].map((attempts) => (purchaseRetryAtOf(attempts, NOW.getTime()).getTime() - NOW.getTime()) / MINUTE)).toEqual([1, 2, 4, 8, 16]);
  });

  it('never waits past six hours, however many times it failed', () => {
    expect(purchaseRetryAtOf(9, NOW.getTime()).getTime() - NOW.getTime()).toBe(256 * MINUTE);
    expect(purchaseRetryAtOf(10, NOW.getTime()).getTime() - NOW.getTime()).toBe(META_PURCHASE_RETRY_MAX_MS);
    expect(purchaseRetryAtOf(400, NOW.getTime()).getTime() - NOW.getTime()).toBe(META_PURCHASE_RETRY_MAX_MS);
  });

  it('reads a try never counted as the first', () => {
    expect(purchaseRetryAtOf(0, NOW.getTime()).getTime() - NOW.getTime()).toBe(MINUTE);
  });
});

describe('when a purchase is past sending', () => {
  it("is given up short of Meta's seven days, never after them", () => {
    const sevenDays = 7 * 24 * 60 * MINUTE;
    expect(META_EVENT_MAX_AGE_MS).toBeLessThan(sevenDays);
    expect(tooOldToSend(new Date(NOW.getTime() - 6 * 24 * 60 * MINUTE), NOW)).toBe(false);
    expect(tooOldToSend(new Date(NOW.getTime() - META_EVENT_MAX_AGE_MS), NOW)).toBe(false);
    expect(tooOldToSend(new Date(NOW.getTime() - META_EVENT_MAX_AGE_MS - 1), NOW)).toBe(true);
    expect(tooOldToSend(new Date(NOW.getTime() - sevenDays), NOW)).toBe(true);
  });
});

interface Order {
  storeId: string;
  status: string;
  paymentChannel: 'ONLINE' | 'OFFLINE';
  totalCents: number;
  deliveryFeeCents: number | null;
  marketingConsent: { orderId: string } | null;
  events: { actor: string }[];
}

const settled: Order = { storeId: 'shop', status: 'RECEIVED', paymentChannel: 'OFFLINE', totalCents: 5000, deliveryFeeCents: 0, marketingConsent: { orderId: 'order' }, events: [{ actor: 'CUSTOMER' }] };

function build(order: Order | null) {
  const createMany = vi.fn(async () => ({ count: 1 }));
  const tx = { order: { findUnique: vi.fn(async () => order) }, orderMetaPurchase: { createMany } } as unknown as Prisma.TransactionClient;
  return { tx, createMany };
}

describe('what an order owes Meta (owePurchase)', () => {
  it('owes a purchase, once, for an order its customer placed with a consent kept', async () => {
    const { tx, createMany } = build(settled);

    expect(await owePurchase(tx, 'order', 'PLACED', NOW)).toBe(true);
    expect(createMany).toHaveBeenCalledWith({ data: [{ orderId: 'order', storeId: 'shop', countedAt: NOW, nextAttemptAt: expect.any(Date) }], skipDuplicates: true });
  });

  it('owes nothing with no consent kept — whatever else is true', async () => {
    const { tx, createMany } = build({ ...settled, marketingConsent: null });

    expect(await owePurchase(tx, 'order', 'PLACED', NOW)).toBe(false);
    expect(createMany).not.toHaveBeenCalled();
  });

  it.each([
    ['a sale the shopkeeper registered', { ...settled, events: [{ actor: 'SHOPKEEPER' }] }, 'PLACED'],
    ['a cancelled order', { ...settled, status: 'CANCELLED' }, 'PLACED'],
    ['an order charged online, at its placement', { ...settled, paymentChannel: 'ONLINE' }, 'PLACED'],
    ['an order settled with the shop, at a payment', settled, 'PAID'],
    ['an order nobody finds', null, 'PLACED'],
  ] as const)('owes nothing for %s', async (_, order, moment) => {
    const { tx, createMany } = build(order as Order | null);

    expect(await owePurchase(tx, 'order', moment, NOW)).toBe(false);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('owes one charged online when it is paid, and one with nothing to pay when it is placed', async () => {
    expect(await owePurchase(build({ ...settled, paymentChannel: 'ONLINE' }).tx, 'order', 'PAID', NOW)).toBe(true);
    expect(await owePurchase(build({ ...settled, paymentChannel: 'ONLINE', totalCents: 0 }).tx, 'order', 'PLACED', NOW)).toBe(true);
  });
});
