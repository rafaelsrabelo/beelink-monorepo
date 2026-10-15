// Nest
import { Logger, Module, type OnModuleInit } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { BillingAccountController } from './billing-account.controller.js';
import { BillingAccounts } from './billing-accounts.service.js';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { PlansController } from './plans.controller.js';
import { PlatformAsaas } from './platform-asaas.client.js';
import { platformAsaasEnvironment, platformAsaasOfThisDeployment } from './platform-asaas.config.js';
import { StoreSubscriptions } from './store-subscriptions.service.js';
import { SubscriptionSync } from './subscription-sync.service.js';

/**
 * What a page owes bee-link (BEELINK-218): the plans, each page's subscription and trial, who is
 * charged for an account's pages, the subscription a page's chosen cycle makes at Asaas, and what
 * Asaas says of its payment, read when the panel asks (BEELINK-221). This is bee-link charging the shopkeeper, at bee-link's own Asaas
 * account (`PlatformAsaas`), and it never meets a shop's own sales: not `modules/payments`, and not
 * the key a shop pasted, which `integrations/asaas` alone opens. What it has in common with those is
 * the request to Asaas itself (`shared/asaas`) and two pure functions of `integrations/asaas`.
 *
 * StoresModule for who owns the page. It does not import this module back: the page's creation
 * writes the trial through a plain function, `subscription-trial.ts`. PrismaModule is global.
 */
@Module({
  imports: [StoresModule],
  controllers: [PlansController, BillingController, BillingAccountController],
  providers: [
    BillingService,
    BillingAccounts,
    StoreSubscriptions,
    SubscriptionSync,
    { provide: PlatformAsaas, useFactory: platformAsaasOfThisDeployment },
  ],
})
export class BillingModule implements OnModuleInit {
  private readonly logger = new Logger(BillingModule.name);

  constructor(private readonly asaas: PlatformAsaas) {}

  /** Said once, at boot, because a key that never arrived looks exactly like one never set: a deploy is checked by this line. */
  onModuleInit(): void {
    if (this.asaas.configured) this.logger.log(`bee-link's own Asaas account is set up (${platformAsaasEnvironment()})`);
    else this.logger.log("bee-link's own Asaas account has no key here: billing is unavailable");
  }
}
