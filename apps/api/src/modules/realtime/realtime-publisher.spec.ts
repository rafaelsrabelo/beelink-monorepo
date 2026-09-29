// Libs
import { describe, expect, it, vi } from 'vitest';
import type { Server } from 'socket.io';

// App
import { RealtimePublisher } from './realtime-publisher.js';

function fakeServer() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { server: { to } as unknown as Server, to, emit };
}

describe('RealtimePublisher', () => {
  it("tells the shop's room, and the shopper's when the event concerns one", () => {
    const { server, to, emit } = fakeServer();
    const publisher = new RealtimePublisher();
    publisher.attach(server);

    publisher.publish({ storeId: 's1', customerId: 'c1' }, { type: 'order.created', orderNumber: 7 });
    expect(to).toHaveBeenLastCalledWith(['store:s1', 'customer:c1']);
    expect(emit).toHaveBeenLastCalledWith('event', { type: 'order.created', orderNumber: 7 });

    publisher.publish({ storeId: 's1', customerId: null }, { type: 'order.status', orderNumber: 7, status: 'ACCEPTED' });
    expect(to).toHaveBeenLastCalledWith(['store:s1']);
  });

  /** A script or a unit test has no socket server: the write it follows must not fail for that. */
  it('tells nobody, and throws nothing, before a server is attached', () => {
    expect(() => new RealtimePublisher().publish({ storeId: 's1', customerId: null }, { type: 'conversation.closed', orderNumber: 1 })).not.toThrow();
  });
});
