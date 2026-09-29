// Nest
import { Injectable } from '@nestjs/common';

// Libs
import type { Server } from 'socket.io';

// Types
import type { RealtimeEvent } from '@harness-monorepo/contracts';

// App
import { customerRoom, REALTIME_EVENT, storeRoom } from './realtime.constants.js';

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
  private server: Server | null = null;

  attach(server: Server): void {
    this.server = server;
  }

  publish(to: RealtimeAudienceOf, event: RealtimeEvent): void {
    const rooms = [storeRoom(to.storeId), ...(to.customerId ? [customerRoom(to.customerId)] : [])];
    this.server?.to(rooms).emit(REALTIME_EVENT, event);
  }
}
