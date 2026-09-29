// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { RealtimePublisherModule } from '../realtime/realtime-publisher.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CustomerOrdersController } from './customer-orders.controller.js';
import { CustomerOrdersService } from './customer-orders.service.js';
import { OrderPlacement } from './order-placement.js';
import { OrderStatusMailer } from './order-status-mailer.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

/**
 * A shop's orders: the owner's side, and the shopper's own from the cart. StoresModule for who owns
 * the shop; CustomersModule and AuthModule for the shopper's record and door; PrismaModule is global.
 */
@Module({
  imports: [StoresModule, CustomersModule, AuthModule, RealtimePublisherModule],
  controllers: [OrdersController, CustomerOrdersController],
  providers: [OrdersService, CustomerOrdersService, OrderPlacement, OrderStatusMailer],
})
export class OrdersModule {}
