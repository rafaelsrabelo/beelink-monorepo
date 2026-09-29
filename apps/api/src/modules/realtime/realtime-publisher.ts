// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { RealtimeEvent } from '@harness-monorepo/contracts';
import type { RealtimeServer } from './realtime-socket.js';

// App
import { customerRoom, REALTIME_EVENT, sessionRoom, storeRoom } from './realtime.constants.js';

/** Who hears an event: the shop's panel, and the shopper it concerns when there is one. */
export interface RealtimeAudienceOf {
  storeId: string;
  customerId: string | null;
}

/**
 * Tells the rooms what changed, once it is written. The services call it after their transaction
 * commits: an event about a write that rolled back would send a browser to read what is not there.
 * Without a socket server — a unit test, a script — it tells nobody, and nothing waits on it.
 */
@Injectable()
export class RealtimePublisher {
  private server: RealtimeServer | null = null;

  attach(server: RealtimeServer): void {
    this.server = server;
  }

  publish(to: RealtimeAudienceOf, event: RealtimeEvent): void {
    const rooms = [storeRoom(to.storeId), ...(to.customerId ? [customerRoom(to.customerId)] : [])];
    this.server?.to(rooms).emit(REALTIME_EVENT, event);
  }

  /**
   * Closes every socket the sessions opened. A ticket is checked once, at the door: without this, a
   * socket would keep hearing its room after a sign-out or a password reset ended its session.
   */
  endSessions(sessionIds: readonly string[]): void {
    if (sessionIds.length === 0) return;
    this.server?.in(sessionIds.map(sessionRoom)).disconnectSockets(true);
  }
}
