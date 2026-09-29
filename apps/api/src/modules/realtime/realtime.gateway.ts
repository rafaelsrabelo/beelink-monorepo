// Nest
import { Logger } from '@nestjs/common';
import { type OnGatewayConnection, type OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';

// Types
import type { RealtimeErrorCode } from '@harness-monorepo/contracts';
import type { RealtimeServer, RealtimeSocket } from './realtime-socket.js';

// App
import { env } from '../../shared/config/env.js';
import { SessionService } from '../auth/session.service.js';
import { RealtimePublisher } from './realtime-publisher.js';
import { RealtimeTicketsService } from './realtime-tickets.service.js';
import { customerRoom, REALTIME_PATH, sessionRoom, storeRoom } from './realtime.constants.js';

/** The refusal a socket gets for a ticket it cannot use: its client asks for another. */
const TICKET_REFUSED = 'REALTIME_TICKET_INVALID' satisfies RealtimeErrorCode;

/**
 * The real-time channel (BEELINK-161). It only tells: a socket enters with a single-use ticket its
 * page's server asked for, joins its room — the shop's panel, or a shopper's own at the shop — and
 * hears what changed there. Nothing is written through it; the REST does that, with its checks.
 *
 * `cors` only lets the long-polling transport answer the web's origin; it guards nothing, since a
 * WebSocket is not subject to it. The ticket is the guard, and it travels in the handshake, not in a
 * cookie: a page on another site has nothing of the visitor's to open a socket with.
 */
@WebSocketGateway({ path: REALTIME_PATH, serveClient: false, cors: { origin: env.CORS_ORIGINS } })
export class RealtimeGateway implements OnGatewayInit<RealtimeServer>, OnGatewayConnection<RealtimeSocket> {
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly tickets: RealtimeTicketsService,
    private readonly publisher: RealtimePublisher,
    private readonly sessions: SessionService,
  ) {}

  afterInit(server: RealtimeServer): void {
    this.publisher.attach(server);
    // Checked before the socket counts as connected: a refused one never joins anything, and its
    // client reads why in `connect_error`.
    server.use((socket, next) => {
      const ticket: unknown = socket.handshake.auth?.ticket;
      if (typeof ticket !== 'string') return next(new Error(TICKET_REFUSED));
      this.tickets.redeem(ticket).then(
        (identity) => {
          if (!identity) return next(new Error(TICKET_REFUSED));
          socket.data.identity = identity;
          next();
        },
        (error: unknown) => {
          this.logger.error(error);
          next(new Error(TICKET_REFUSED));
        },
      );
    });
  }

  async handleConnection(socket: RealtimeSocket): Promise<void> {
    const identity = socket.data.identity;
    if (!identity) {
      socket.disconnect(true);
      return;
    }
    const room = identity.audience === 'SHOP' ? storeRoom(identity.storeId) : customerRoom(identity.customerId);
    await socket.join([room, sessionRoom(identity.sessionId)]);
    // Joined first, checked after: a session that ends meanwhile either finds this socket in its
    // room, or is read here. A read that fails closes the socket too — its client asks again.
    const alive = await this.sessions.isActive(identity.sessionId).catch((error: unknown) => {
      this.logger.error(error);
      return false;
    });
    if (!alive) socket.disconnect(true);
  }
}
