// Nest
import { Module } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
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
 * shipping tickets, which reach Melhor Envio through its `accessTokenFor`.
 */
@Module({
  imports: [StoresModule],
  controllers: [MelhorEnvioController, MelhorEnvioCallbackController, MelhorEnvioSettingsController],
  providers: [MelhorEnvioClient, MelhorEnvioService, MelhorEnvioRefresher, MelhorEnvioSettingsService],
  exports: [MelhorEnvioService, MelhorEnvioSettingsService],
})
export class IntegrationsModule {}
