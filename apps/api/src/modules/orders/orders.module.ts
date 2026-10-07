// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { DeliveryModule } from '../delivery/delivery.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { RealtimePublisherModule } from '../realtime/realtime-publisher.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CartQuoteController } from './cart-quote.controller.js';
import { CustomerCartQuoteController } from './customer-cart-quote.controller.js';
import { CustomerOffersController } from './customer-offers.controller.js';
import { CustomerOffersReader } from './customer-offers.service.js';
import { CustomerOrdersController } from './customer-orders.controller.js';
import { CustomerOrdersService } from './customer-orders.service.js';
import { OrderPlacement } from './order-placement.js';
import { OrderQuotes } from './order-quote.service.js';
import { OrderShipping } from './order-shipping.js';
import { OrderStatusMailer } from './order-status-mailer.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

/**
 * A shop's orders: the owner's side, the shopper's own from the cart, what a cart would cost, and the shown
 * coupons a shopper's cart may take — read against that same cost. StoresModule for who owns
 * the shop; CustomersModule and AuthModule for the shopper's record and door; DeliveryModule for what a
 * delivery costs and when it arrives (BEELINK-178); PaymentsModule for the charge of an order paid online
 * (BEELINK-204), which never imports this one back; PrismaModule is global.
 */
@Module({
  imports: [StoresModule, CustomersModule, AuthModule, RealtimePublisherModule, DeliveryModule, PaymentsModule],
  controllers: [OrdersController, CustomerOrdersController, CartQuoteController, CustomerCartQuoteController, CustomerOffersController],
  providers: [OrdersService, CustomerOrdersService, OrderPlacement, OrderQuotes, CustomerOffersReader, OrderShipping, OrderStatusMailer],
  // For a carrier moving an order along (BEELINK-188).
  exports: [OrdersService],
})
export class OrdersModule {}
