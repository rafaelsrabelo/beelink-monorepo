// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CustomerPaymentsController } from './customer-payments.controller.js';
import { CustomerPayments } from './customer-payments.service.js';
import { OrderPayments } from './order-payments.service.js';
import { PublicPaymentsController } from './public-payments.controller.js';

/**
 * An order charged online, at the shop's own Asaas account (BEELINK-204): the rules of its charge,
 * with no key in sight — IntegrationsModule's `AsaasCharges` opens it. CustomersModule and AuthModule
 * for the shopper's record and door; StoresModule for the shop a visitor's checkout names (BEELINK-205). OrdersModule imports this, never the other way: an order here is
 * read through Prisma, which is global.
 */
@Module({
  imports: [IntegrationsModule, CustomersModule, AuthModule, StoresModule],
  controllers: [CustomerPaymentsController, PublicPaymentsController],
  providers: [OrderPayments, CustomerPayments],
  exports: [OrderPayments],
})
export class PaymentsModule {}
