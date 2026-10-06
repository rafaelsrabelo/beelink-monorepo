// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { RealtimePublisherModule } from '../realtime/realtime-publisher.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CustomerPaymentsController } from './customer-payments.controller.js';
import { CustomerPayments } from './customer-payments.service.js';
import { OrderPaidMailer } from './order-paid-mailer.js';
import { OrderPayments } from './order-payments.service.js';
import { OrderRefundMailer } from './order-refund-mailer.js';
import { OrderRefunds } from './order-refunds.service.js';
import { PaymentNews } from './payment-news.js';
import { PaymentSync } from './payment-sync.service.js';
import { PublicPaymentsController } from './public-payments.controller.js';

/**
 * An order charged online, at the shop's own Asaas account (BEELINK-204): the rules of its charge,
 * with no key in sight — IntegrationsModule's `AsaasCharges` opens it. CustomersModule and AuthModule
 * for the shopper's record and door; StoresModule for the shop a visitor's checkout names (BEELINK-205). OrdersModule imports this, never the other way: an order here is
 * read through Prisma, which is global. `PaymentSync` — what Asaas holds for an order, heard and written
 * — is exported for the webhook and the reconciliation (BEELINK-206); RealtimePublisherModule for telling
 * both sides a charge moved. `OrderPaidMailer` is the outbox of a payment approved's e-mail (BEELINK-207).
 * `OrderRefunds` gives money back — asked from the order's page, or by the order's cancellation — and
 * `OrderRefundMailer` is the outbox of a refund's e-mail (BEELINK-208).
 */
@Module({
  imports: [IntegrationsModule, CustomersModule, AuthModule, StoresModule, RealtimePublisherModule],
  controllers: [CustomerPaymentsController, PublicPaymentsController],
  providers: [OrderPayments, OrderRefunds, CustomerPayments, PaymentSync, PaymentNews, OrderPaidMailer, OrderRefundMailer],
  exports: [OrderPayments, OrderRefunds, PaymentSync],
})
export class PaymentsModule {}
