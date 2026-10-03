// Nest
import { Module } from '@nestjs/common';

// App
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { CarrierTracking } from './carrier-tracking.service.js';
import { LabelTrackingRoutine } from './label-tracking.routine.js';
import { MelhorEnvioWebhookController } from './melhor-envio-webhook.controller.js';

/**
 * A carrier moving an order along (BEELINK-188): Melhor Envio's webhook and the periodic check, both
 * applying a label's status to its order. Apart from the integrations, which the orders already reach
 * for the shipping quote: here the orders are moved, so this module needs both. PrismaModule is global.
 */
@Module({
  imports: [IntegrationsModule, OrdersModule],
  controllers: [MelhorEnvioWebhookController],
  providers: [CarrierTracking, LabelTrackingRoutine],
})
export class CarrierTrackingModule {}
