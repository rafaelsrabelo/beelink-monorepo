// Libs
import { describe, expect, it } from 'vitest';

// App
import { toCustomerConversation, toOrderHead, toShopConversation } from './conversations.mapper.js';

const at = new Date('2026-09-29T12:00:00.000Z');
const message = (author: 'CUSTOMER' | 'SHOP', readAt: Date | null) => ({
  id: `${author}-${String(readAt)}`,
  conversationId: 'c1',
  author,
  userId: 'u1',
  body: 'Oi',
  status: null,
  notice: null,
  cashbackCents: null,
  refundCents: null,
  createdAt: at,
  readAt,
});
const notice = (status: 'ACCEPTED' | 'OUT_FOR_DELIVERY' | 'CANCELLED', readAt: Date | null) => ({
  id: `SYSTEM-${status}`,
  conversationId: 'c1',
  author: 'SYSTEM' as const,
  userId: null,
  body: '',
  status,
  notice: null,
  cashbackCents: null,
  refundCents: null,
  createdAt: at,
  readAt,
});
const head = { number: 1, status: 'RECEIVED' as const, fulfillment: 'DELIVERY' as const };

describe('the conversation, as each side reads it', () => {
  it('takes messages while the order is on its way, and not once it is over', () => {
    expect(toOrderHead({ ...head, status: 'OUT_FOR_DELIVERY' }).open).toBe(true);
    expect(toOrderHead({ ...head, status: 'DELIVERED' }).open).toBe(false);
    expect(toOrderHead({ ...head, status: 'CANCELLED' }).open).toBe(false);
  });

  it("counts, for each side, the other side's messages it has not read", () => {
    const messages = [message('CUSTOMER', null), message('CUSTOMER', at), message('SHOP', null), message('SHOP', null)];
    const order = { ...head, customer: { id: 'k1', name: 'Bia', userId: 'u1' } };

    expect(toCustomerConversation(order, messages).unread).toBe(2);
    expect(toShopConversation(order, messages).unread).toBe(1);
  });

  it('tells the shop when the customer no longer has an account to read an answer', () => {
    expect(toShopConversation({ ...head, customer: { id: 'k1', name: 'Bia', userId: 'u1' } }, []).customer).toEqual({ id: 'k1', name: 'Bia', hasAccount: true });
    expect(toShopConversation({ ...head, customer: { id: 'k1', name: 'Bia', userId: null } }, []).customer.hasAccount).toBe(false);
  });

  /** BEELINK-236: a move is news to the customer, and the shop's own doing. */
  it('counts a status notice as unread for the customer only, and hands it over as its status alone', () => {
    const messages = [notice('ACCEPTED', at), notice('OUT_FOR_DELIVERY', null), message('SHOP', null)];
    const order = { ...head, customer: { id: 'k1', name: 'Bia', userId: 'u1' } };

    expect(toCustomerConversation(order, messages).unread).toBe(2);
    expect(toShopConversation(order, messages).unread).toBe(0);
    expect(toCustomerConversation(order, messages).messages[1]).toEqual({
      kind: 'STATUS',
      id: 'SYSTEM-OUT_FOR_DELIVERY',
      status: 'OUT_FOR_DELIVERY',
      unpaid: false,
      cashbackCents: null,
      createdAt: '2026-09-29T12:00:00.000Z',
      readAt: null,
    });
  });

  /** BEELINK-207: a payment approved is a line of its own, and a cancellation says when nobody paid. */
  it('hands a payment approved over as its own kind, unread for the customer, and says why bee-link cancelled', () => {
    const paid = { ...notice('ACCEPTED', null), id: 'SYSTEM-PAID', status: null, notice: 'PAYMENT_APPROVED' as const };
    const unpaid = { ...notice('CANCELLED', null), notice: 'CANCELLED_UNPAID' as const };
    const order = { ...head, customer: { id: 'k1', name: 'Bia', userId: 'u1' } };
    const read = toCustomerConversation(order, [paid, unpaid, notice('CANCELLED', at)]);

    expect(read.messages[0]).toEqual({ kind: 'PAYMENT', id: 'SYSTEM-PAID', createdAt: '2026-09-29T12:00:00.000Z', readAt: null });
    expect(read.messages[1]).toMatchObject({ kind: 'STATUS', status: 'CANCELLED', unpaid: true });
    expect(read.messages[2]).toMatchObject({ kind: 'STATUS', status: 'CANCELLED', unpaid: false });
    expect(read.unread).toBe(2);
    expect(toShopConversation(order, [paid, unpaid]).unread).toBe(0);
  });

  /** To the customer the shop is the shop: never which account answered. */
  it('never tells which account wrote a message', () => {
    const read = toCustomerConversation(head, [message('SHOP', null)]);

    expect(read.messages[0]).toEqual({ kind: 'MESSAGE', id: 'SHOP-null', author: 'SHOP', body: 'Oi', createdAt: '2026-09-29T12:00:00.000Z', readAt: null });
  });
});
