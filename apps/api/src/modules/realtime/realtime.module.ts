// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CustomerRealtimeTicketsController } from './customer-realtime-tickets.controller.js';
import { RealtimeOrigins } from './realtime-origins.js';
import { RealtimePublisherModule } from './realtime-publisher.module.js';
import { RealtimeTicketsController } from './realtime-tickets.controller.js';
import { RealtimeTicketsService } from './realtime-tickets.service.js';
import { RealtimeGateway } from './realtime.gateway.js';

/**
 * The real-time channel (BEELINK-161): the gateway and the tickets that let a socket in. The
 * publisher everyone tells through is RealtimePublisherModule's, handed the server here. StoresModule
 * and CustomersModule decide whose ticket a session gets, AuthModule whether that session is still
 * alive; PrismaModule is global. `RealtimeOrigins` says which origins the transport answers, and is
 * read by the adapter `app.setup.ts` installs.
 */
@Module({
  imports: [StoresModule, CustomersModule, AuthModule, RealtimePublisherModule],
  controllers: [RealtimeTicketsController, CustomerRealtimeTicketsController],
  providers: [RealtimeGateway, RealtimeTicketsService, RealtimeOrigins],
})
export class RealtimeModule {}
