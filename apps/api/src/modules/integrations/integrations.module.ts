// Nest
import { Module } from '@nestjs/common';

// App
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
 * from the shop's wallet here too (BEELINK-187).
 */
@Module({
  imports: [StoresModule],
  controllers: [MelhorEnvioController, MelhorEnvioCallbackController, MelhorEnvioSettingsController, OrderLabelsController],
  providers: [MelhorEnvioClient, MelhorEnvioService, MelhorEnvioRefresher, MelhorEnvioSettingsService, CarrierGapsService, CarrierQuotes, OrderLabels],
  exports: [MelhorEnvioService, MelhorEnvioSettingsService, CarrierGapsService, CarrierQuotes],
})
export class IntegrationsModule {}
