// Nest
import { Module } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { PlansController } from './plans.controller.js';

/**
 * What a page owes bee-link (BEELINK-218): the plans, and each page's subscription and trial. This
 * is bee-link charging the shopkeeper, and it shares nothing with a shop's own sales — not
 * `modules/payments`, not `integrations/asaas`, whose key is the shop's.
 *
 * StoresModule for who owns the page. It does not import this module back: the page's creation
 * writes the trial through a plain function, `subscription-trial.ts`. PrismaModule is global.
 */
@Module({
  imports: [StoresModule],
  controllers: [PlansController, BillingController],
  providers: [BillingService],
})
export class BillingModule {}
