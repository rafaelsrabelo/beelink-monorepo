// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CustomerRealtimeTicketsController } from './customer-realtime-tickets.controller.js';
import { RealtimePublisher } from './realtime-publisher.js';
import { RealtimeTicketsController } from './realtime-tickets.controller.js';
import { RealtimeTicketsService } from './realtime-tickets.service.js';
import { RealtimeGateway } from './realtime.gateway.js';

/**
 * The real-time channel (BEELINK-161): the gateway, the tickets that let a socket in, and the
 * publisher the orders and the conversations tell through. StoresModule and CustomersModule decide
 * whose ticket a session gets; PrismaModule is global.
 */
@Module({
  imports: [StoresModule, CustomersModule, AuthModule],
  controllers: [RealtimeTicketsController, CustomerRealtimeTicketsController],
  providers: [RealtimeGateway, RealtimeTicketsService, RealtimePublisher],
  exports: [RealtimePublisher],
})
export class RealtimeModule {}
