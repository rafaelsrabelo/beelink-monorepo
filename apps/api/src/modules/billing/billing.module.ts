// Nest
import { Logger, Module, type OnModuleInit } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { BillingAccountController } from './billing-account.controller.js';
import { BillingAccounts } from './billing-accounts.service.js';
import { BillingEvents } from './billing-events.service.js';
import { BillingRoutine } from './billing-routine.js';
import { BillingWebhookController } from './billing-webhook.controller.js';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { ChargingNoticeMailer } from './charging-notice-mailer.js';
import { PageLocks } from './page-locks.service.js';
import { PlansController } from './plans.controller.js';
import { PlatformCoupons } from './platform-coupons.service.js';
import { PlatformAsaas } from './platform-asaas.client.js';
import { platformAsaasEnvironment, platformAsaasOfThisDeployment } from './platform-asaas.config.js';
import { PlatformWebhookKeeper } from './platform-webhook-keeper.js';
import { StoreSubscriptions } from './store-subscriptions.service.js';
import { SubscriptionSync } from './subscription-sync.service.js';

/**
 * What a page owes bee-link (BEELINK-218): the plans, each page's subscription and trial, who is
 * charged for an account's pages, the subscription a page's chosen cycle makes at Asaas, and what
 * Asaas says of its payment — by bee-link's own webhook, the routine behind it, or the panel asking
 * (BEELINK-221) — bee-link's own coupons, each a free month for a page (BEELINK-224), and the e-mail that tells a shopkeeper the day charging starts (BEELINK-297), sent from the outbox a terminal's command fills. This is bee-link charging the shopkeeper, at bee-link's own Asaas
 * account (`PlatformAsaas`), and it never meets a shop's own sales: not `modules/payments`, and not
 * the key a shop pasted, which `integrations/asaas` alone opens. What it has in common with those is
 * the request to Asaas itself (`shared/asaas`) and two pure functions of `integrations/asaas`.
 *
 * StoresModule for who owns the page. It does not import this module back: the page's creation
 * writes the trial through a plain function, `subscription-trial.ts`. PrismaModule is global.
 */
@Module({
  imports: [StoresModule],
  controllers: [PlansController, BillingController, BillingAccountController, BillingWebhookController],
  providers: [
    BillingService,
    BillingAccounts,
    StoreSubscriptions,
    SubscriptionSync,
    BillingEvents,
    PlatformWebhookKeeper,
    BillingRoutine,
    PageLocks,
    PlatformCoupons,
    ChargingNoticeMailer,
    { provide: PlatformAsaas, useFactory: platformAsaasOfThisDeployment },
  ],
  // The lock is asked on every route of a page, by a guard the application registers beside the session's.
  exports: [PageLocks],
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
