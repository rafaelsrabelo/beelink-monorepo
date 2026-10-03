// Nest
import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req, UnauthorizedException, type RawBodyRequest } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

// Libs
import type { FastifyRequest } from 'fastify';

// App
import { Public } from '../auth/auth.decorators.js';
import { integrationError } from '../integrations/integrations.constants.js';
import { melhorEnvioConfig } from '../integrations/melhor-envio/melhor-envio.client.js';
import { CarrierTracking, type LabelUpdateResult } from './carrier-tracking.service.js';
import { isMelhorEnvioSigned } from './webhook-signature.js';

/** A Melhor Envio label event as its webhook sends it; anything else in it is left alone. */
interface MelhorEnvioWebhookBody {
  event?: unknown;
  data?: { id?: unknown; status?: unknown; tracking?: unknown; tracking_url?: unknown };
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

/**
 * Where Melhor Envio tells of every label bee-link's app generated (BEELINK-188), registered once in
 * the app at `https://<WEB_DOMAIN>/api/integrations/melhor-envio/webhook` — the web's route hands the
 * body over as it arrived. Signed with the app's secret, and refused unsigned. Melhor Envio tries what
 * is not answered 2xx five more times, so a label bee-link does not know is answered 200 and left.
 */
@ApiExcludeController()
@Controller('integrations/melhor-envio/webhook')
export class MelhorEnvioWebhookController {
  constructor(private readonly tracking: CarrierTracking) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  async receive(@Req() request: RawBodyRequest<FastifyRequest>, @Headers('x-me-signature') signature: string | undefined, @Body() body: MelhorEnvioWebhookBody): Promise<{ result: LabelUpdateResult | 'IGNORED' }> {
    const config = melhorEnvioConfig();
    if (!config || !request.rawBody || !isMelhorEnvioSigned(request.rawBody, signature, config.clientSecret)) {
      throw new UnauthorizedException(integrationError('INTEGRATION_SIGNATURE_INVALID', 'The webhook is not signed by the app'));
    }

    const labelId = text(body?.data?.id);
    const event = text(body?.event);
    // `order.posted` names the status as `data.status` does; either says it.
    const status = text(body?.data?.status) ?? (event?.startsWith('order.') ? event.slice('order.'.length) : null);
    if (!labelId || !status) return { result: 'IGNORED' };

    return { result: await this.tracking.apply({ labelId, status, trackingCode: text(body?.data?.tracking), trackingUrl: text(body?.data?.tracking_url) }) };
  }
}
