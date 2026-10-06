// Nest
import { Module } from '@nestjs/common';

// App
import { AsaasAcceptance } from './asaas/asaas-acceptance.js';
import { AsaasApproval } from './asaas/asaas-approval.service.js';
import { AsaasCharges } from './asaas/asaas-charges.service.js';
import { AsaasClient } from './asaas/asaas.client.js';
import { AsaasController } from './asaas/asaas.controller.js';
import { AsaasConnectionService } from './asaas/asaas-connection.service.js';
import { AsaasHttpClient } from './asaas/asaas-http.client.js';
import { AsaasSettingsController } from './asaas/asaas-settings.controller.js';
import { AsaasSettingsService } from './asaas/asaas-settings.service.js';
import { AsaasWebhookDoor } from './asaas/asaas-webhook-door.js';
import { AsaasWebhookKeeper } from './asaas/asaas-webhook-keeper.js';
import { CarrierGapsService } from './carrier-gaps.service.js';
import { StoresModule } from '../stores/stores.module.js';
import { CarrierQuotes } from './melhor-envio/carrier-quote.service.js';
import { OrderLabelsController } from './melhor-envio/labels/order-labels.controller.js';
import { OrderLabels } from './melhor-envio/labels/order-labels.service.js';
import { MelhorEnvioClient } from './melhor-envio/melhor-envio.client.js';
import { MelhorEnvioCallbackController, MelhorEnvioController } from './melhor-envio/melhor-envio.controller.js';
import { MelhorEnvioRefresher } from './melhor-envio/melhor-envio-refresher.js';
import { MelhorEnvioSettingsController } from './melhor-envio/melhor-envio-settings.controller.js';
import { MelhorEnvioSettingsService } from './melhor-envio/melhor-envio-settings.service.js';
import { MelhorEnvioService } from './melhor-envio/melhor-envio.service.js';

/**
 * A shop's own accounts at the third parties that act in its name (BEELINK-182): Melhor Envio now,
 * Asaas next. What they gave the shop is sealed by `secret-vault.ts` and opened nowhere outside this
 * folder (gate `api/sealed-secret-in-integrations`). `MelhorEnvioService` is exported for the
 * shipping tickets, which reach Melhor Envio through its `accessTokenFor`; `CarrierGapsService` for the
 * catalogue, which says which products a carrier cannot quote; `CarrierQuotes` for the shipping quote,
 * which lists the carriers beside the shop's own delivery (BEELINK-185). An order's label is bought
 * from the shop's wallet here too (BEELINK-187). A shop's Asaas account is connected with its own
 * key (BEELINK-202), through `AsaasClient` — a port, bound here to Asaas over HTTP — and how the shop
 * is paid through it is kept beside the connection (BEELINK-203). `AsaasAcceptance` and `AsaasCharges` are
 * exported for the payments (BEELINK-204): what a shop takes now, and its charges by the shop's id —
 * neither takes nor answers a key. For the shop's webhook (BEELINK-206): `AsaasWebhookDoor` says whose
 * token a request carries, `AsaasWebhookKeeper` keeps the webhook sending and the key in use, and
 * `AsaasConnectionService` is exported for its `beforeKeyLeaves` alone. `AsaasApproval` is exported for
 * the payments too (BEELINK-278): a charge Asaas refused makes it ask whether the account is approved.
 */
@Module({
  imports: [StoresModule],
  controllers: [MelhorEnvioController, MelhorEnvioCallbackController, MelhorEnvioSettingsController, OrderLabelsController, AsaasController, AsaasSettingsController],
  providers: [
    MelhorEnvioClient,
    MelhorEnvioService,
    MelhorEnvioRefresher,
    MelhorEnvioSettingsService,
    CarrierGapsService,
    CarrierQuotes,
    OrderLabels,
    { provide: AsaasClient, useClass: AsaasHttpClient },
    AsaasConnectionService,
    AsaasSettingsService,
    AsaasAcceptance,
    AsaasApproval,
    AsaasCharges,
    AsaasWebhookDoor,
    AsaasWebhookKeeper,
  ],
  exports: [MelhorEnvioService, MelhorEnvioSettingsService, CarrierGapsService, CarrierQuotes, MelhorEnvioClient, AsaasAcceptance, AsaasApproval, AsaasCharges, AsaasConnectionService, AsaasWebhookDoor, AsaasWebhookKeeper],
})
export class IntegrationsModule {}
