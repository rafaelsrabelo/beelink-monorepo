// Nest
import { Logger } from '@nestjs/common';
import { type OnGatewayConnection, type OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

// Libs
import type { Server, Socket } from 'socket.io';

// App
import { env } from '../../shared/config/env.js';
import { RealtimePublisher } from './realtime-publisher.js';
import { RealtimeTicketsService, type RealtimeIdentity } from './realtime-tickets.service.js';
import { customerRoom, REALTIME_PATH, storeRoom } from './realtime.constants.js';

/** The refusal a socket gets for a ticket it cannot use: the client stops asking with that one. */
export const TICKET_REFUSED = 'REALTIME_TICKET_INVALID';

/**
 * The real-time channel (BEELINK-161). It only tells: a socket enters with a single-use ticket its
 * page's server asked for, joins its room — the shop's panel, or a shopper's own at the shop — and
 * hears what changed there. Nothing is written through it; the REST does that, with its checks.
 */
@WebSocketGateway({ path: REALTIME_PATH, cors: { origin: env.CORS_ORIGINS } })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer() server!: Server;

  constructor(
    private readonly tickets: RealtimeTicketsService,
    private readonly publisher: RealtimePublisher,
  ) {}

  afterInit(server: Server): void {
    this.publisher.attach(server);
    // Checked before the socket counts as connected: a refused one never joins anything, and its
    // client reads why in `connect_error`.
    server.use((socket, next) => {
      const ticket: unknown = socket.handshake.auth?.ticket;
      if (typeof ticket !== 'string') return next(new Error(TICKET_REFUSED));
      this.tickets
        .redeem(ticket)
        .then((identity) => {
          if (!identity) return next(new Error(TICKET_REFUSED));
          (socket.data as { identity?: RealtimeIdentity }).identity = identity;
          next();
        })
        .catch((error: unknown) => {
          this.logger.error(error);
          next(new Error(TICKET_REFUSED));
        });
    });
  }

  async handleConnection(socket: Socket): Promise<void> {
    const identity = (socket.data as { identity?: RealtimeIdentity }).identity;
    if (!identity) {
      socket.disconnect(true);
      return;
    }
    await socket.join(identity.audience === 'SHOP' ? storeRoom(identity.storeId) : customerRoom(identity.customerId!));
  }
}
