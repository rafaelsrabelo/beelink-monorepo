// Nest
import { Module } from '@nestjs/common';

// App
import { RealtimePublisher } from './realtime-publisher.js';

/**
 * The publisher alone, importing nothing: the orders and the conversations tell through it, and the
 * sessions end their sockets through it. AuthModule could not import RealtimeModule — that one needs
 * AuthModule to issue tickets — so the one instance lives here, and RealtimeModule's gateway hands
 * it the server.
 */
@Module({
  providers: [RealtimePublisher],
  exports: [RealtimePublisher],
})
export class RealtimePublisherModule {}
