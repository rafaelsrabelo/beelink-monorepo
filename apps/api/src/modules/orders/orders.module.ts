// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { DeliveryModule } from '../delivery/delivery.module.js';
import { RealtimePublisherModule } from '../realtime/realtime-publisher.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CartQuoteController } from './cart-quote.controller.js';
import { CustomerCartQuoteController } from './customer-cart-quote.controller.js';
import { CustomerOrdersController } from './customer-orders.controller.js';
import { CustomerOrdersService } from './customer-orders.service.js';
import { OrderPlacement } from './order-placement.js';
import { OrderQuotes } from './order-quote.service.js';
import { OrderShipping } from './order-shipping.js';
import { OrderStatusMailer } from './order-status-mailer.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

/**
 * A shop's orders: the owner's side, the shopper's own from the cart, and what a cart would cost. StoresModule for who owns
 * the shop; CustomersModule and AuthModule for the shopper's record and door; DeliveryModule for what a
 * delivery costs and when it arrives (BEELINK-178); PrismaModule is global.
 */
@Module({
  imports: [StoresModule, CustomersModule, AuthModule, RealtimePublisherModule, DeliveryModule],
  controllers: [OrdersController, CustomerOrdersController, CartQuoteController, CustomerCartQuoteController],
  providers: [OrdersService, CustomerOrdersService, OrderPlacement, OrderQuotes, OrderShipping, OrderStatusMailer],
})
export class OrdersModule {}
