// Libs
import type { DefaultEventsMap, Server, Socket } from 'socket.io';

// Types
import type { RealtimeEvent } from '@harness-monorepo/contracts';

/** Who a ticket let in. A shopper's always names their record at the shop; a shopkeeper's never does. */
export type RealtimeIdentity =
  | { audience: 'SHOP'; storeId: string; sessionId: string }
  | { audience: 'CUSTOMER'; storeId: string; customerId: string; sessionId: string };

/** The one event the server emits, typed: a publish cannot send a shape the web does not read. */
interface RealtimeEmits {
  event: (event: RealtimeEvent) => void;
}

/** Set by the gateway's middleware once the ticket is taken; absent on a socket that never got in. */
interface RealtimeSocketData {
  identity?: RealtimeIdentity;
}

export type RealtimeServer = Server<DefaultEventsMap, RealtimeEmits, DefaultEventsMap, RealtimeSocketData>;
export type RealtimeSocket = Socket<DefaultEventsMap, RealtimeEmits, DefaultEventsMap, RealtimeSocketData>;
