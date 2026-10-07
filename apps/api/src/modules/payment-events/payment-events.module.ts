// Nest
import { Module } from '@nestjs/common';

// App
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { AsaasEvents } from './asaas-events.service.js';
import { AsaasWebhookController } from './asaas-webhook.controller.js';
import { PaymentReconciliation } from './payment-reconciliation.js';
import { PaymentRoutine } from './payment-routine.js';
import { UnpaidOrders } from './unpaid-orders.js';

/**
 * What Asaas tells of an order's payment, and what the clock does about one (BEELINK-206): the
 * shop's webhook, the reconciliation behind it, and the cancellation of an order nobody paid. Apart
 * from PaymentsModule, which the orders import: here an order is cancelled, so this module needs
 * both — as CarrierTrackingModule does for a carrier. IntegrationsModule for whose webhook a request
 * is and for keeping it sending. ReportsModule for the funnel's old days, which the routine's clock
 * deletes (BEELINK-276). PrismaModule is global.
 */
@Module({
  imports: [IntegrationsModule, PaymentsModule, OrdersModule, ReportsModule],
  controllers: [AsaasWebhookController],
  providers: [AsaasEvents, PaymentReconciliation, UnpaidOrders, PaymentRoutine],
})
export class PaymentEventsModule {}
