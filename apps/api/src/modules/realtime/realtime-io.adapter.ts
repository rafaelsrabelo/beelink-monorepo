// Nest
import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

// Types
import type { Server, ServerOptions } from 'socket.io';

// App
import { RealtimeOrigins } from './realtime-origins.js';

/**
 * Socket.IO on Fastify's own server, with the one option a gateway's decorator cannot hold: whose
 * origin the long-polling transport answers is read from the database (`RealtimeOrigins`), and a
 * decorator is evaluated before anything can be injected.
 */
export class RealtimeIoAdapter extends IoAdapter {
  private readonly origins: RealtimeOrigins;

  constructor(app: INestApplicationContext) {
    super(app);
    this.origins = app.get(RealtimeOrigins);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const cors = {
      origin: (origin: string | undefined, answer: (error: Error | null, allowed?: boolean) => void) => {
        // A lookup that throws answers no origin: the transport stays shut to that page, never open to all.
        this.origins.allows(origin).then(
          (allowed) => answer(null, allowed),
          () => answer(null, false),
        );
      },
    } satisfies ServerOptions['cors'];

    // The gateway's own options, with this over them. Spread from an optional they read as all
    // optional, which is the cast: Nest always hands a gateway's options here.
    return super.createIOServer(port, { ...options, cors } as ServerOptions) as Server;
  }
}
