// Libs
import { describe, expect, it } from 'vitest';

// App
import { toCustomerConversation, toOrderHead, toShopConversation } from './conversations.mapper.js';

const at = new Date('2026-09-29T12:00:00.000Z');
const message = (author: 'CUSTOMER' | 'SHOP', readAt: Date | null) => ({ id: `${author}-${String(readAt)}`, conversationId: 'c1', author, userId: 'u1', body: 'Oi', createdAt: at, readAt });

describe('the conversation, as each side reads it', () => {
  it('takes messages while the order is on its way, and not once it is over', () => {
    expect(toOrderHead({ number: 1, status: 'OUT_FOR_DELIVERY' }).open).toBe(true);
    expect(toOrderHead({ number: 1, status: 'DELIVERED' }).open).toBe(false);
    expect(toOrderHead({ number: 1, status: 'CANCELLED' }).open).toBe(false);
  });

  it("counts, for each side, the other side's messages it has not read", () => {
    const messages = [message('CUSTOMER', null), message('CUSTOMER', at), message('SHOP', null), message('SHOP', null)];
    const order = { number: 1, status: 'RECEIVED' as const, customer: { id: 'k1', name: 'Bia' } };

    expect(toCustomerConversation(order, messages).unread).toBe(2);
    expect(toShopConversation(order, messages).unread).toBe(1);
  });

  /** To the customer the shop is the shop: never which account answered. */
  it('never tells which account wrote a message', () => {
    const read = toCustomerConversation({ number: 1, status: 'RECEIVED' }, [message('SHOP', null)]);

    expect(read.messages[0]).toEqual({ id: 'SHOP-null', author: 'SHOP', body: 'Oi', createdAt: '2026-09-29T12:00:00.000Z', readAt: null });
  });
});
