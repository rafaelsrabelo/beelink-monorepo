// Libs
import { describe, expect, it, vi } from 'vitest';

// Types
import type { RealtimeServer } from './realtime-socket.js';

// App
import { RealtimePublisher } from './realtime-publisher.js';

function fakeServer() {
  const emit = vi.fn();
  const disconnectSockets = vi.fn();
  const to = vi.fn(() => ({ emit }));
  const into = vi.fn(() => ({ disconnectSockets }));
  return { server: { to, in: into } as unknown as RealtimeServer, to, emit, into, disconnectSockets };
}

describe('RealtimePublisher', () => {
  it("tells the shop's room, and the shopper's when the event concerns one", () => {
    const { server, to, emit } = fakeServer();
    const publisher = new RealtimePublisher();
    publisher.attach(server);

    publisher.publish({ storeId: 's1', customerId: 'c1' }, { type: 'order.created', orderNumber: 7, placedBy: 'CUSTOMER' });
    expect(to).toHaveBeenLastCalledWith(['store:s1', 'customer:c1']);
    expect(emit).toHaveBeenLastCalledWith('event', { type: 'order.created', orderNumber: 7, placedBy: 'CUSTOMER' });

    publisher.publish({ storeId: 's1', customerId: null }, { type: 'order.status', orderNumber: 7, status: 'ACCEPTED' });
    expect(to).toHaveBeenLastCalledWith(['store:s1']);
  });

  it("closes every socket of the sessions that ended, and asks nothing for none", () => {
    const { server, into, disconnectSockets } = fakeServer();
    const publisher = new RealtimePublisher();
    publisher.attach(server);

    publisher.endSessions(['a', 'b']);
    expect(into).toHaveBeenCalledWith(['session:a', 'session:b']);
    expect(disconnectSockets).toHaveBeenCalledWith(true);

    publisher.endSessions([]);
    expect(into).toHaveBeenCalledTimes(1);
  });

  /** A script or a unit test has no socket server: the write it follows must not fail for that. */
  it('tells nobody, and throws nothing, before a server is attached', () => {
    const publisher = new RealtimePublisher();
    expect(() => publisher.publish({ storeId: 's1', customerId: null }, { type: 'conversation.closed', orderNumber: 1 })).not.toThrow();
    expect(() => publisher.endSessions(['a'])).not.toThrow();
  });
});
