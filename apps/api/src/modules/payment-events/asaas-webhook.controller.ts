// Nest
import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req, UnauthorizedException, type RawBodyRequest } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

// Libs
import type { FastifyRequest } from 'fastify';

// App
import { Public } from '../auth/auth.decorators.js';
import { AsaasWebhookDoor } from '../integrations/asaas/asaas-webhook-door.js';
import { integrationError } from '../integrations/integrations.constants.js';
import { AsaasEvents, type AsaasEventReceipt } from './asaas-events.service.js';

/**
 * Where Asaas tells of a shop's charges (BEELINK-206): the webhook bee-link registered at the shop's
 * own account, at `https://<WEB_DOMAIN>/api/integrations/asaas/webhook` — the web's route hands the
 * body over as it arrived. One address for every shop: the token in `asaas-access-token`, made for
 * that shop alone when it connected, says which, and a request without a shop's token is refused.
 *
 * It answers 200 only once the event is written, and never waits for what the event leads to: Asaas
 * pauses a webhook after fifteen failures in a row, so nothing that can fail later is done here. A
 * body it cannot make sense of — a field Asaas added, no `payment`, no `id` — is still written.
 */
@ApiExcludeController()
@Controller('integrations/asaas/webhook')
export class AsaasWebhookController {
  constructor(
    private readonly door: AsaasWebhookDoor,
    private readonly events: AsaasEvents,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  async receive(@Req() request: RawBodyRequest<FastifyRequest>, @Headers('asaas-access-token') token: string | undefined, @Body() body: unknown): Promise<{ result: AsaasEventReceipt }> {
    const shop = await this.door.shopOf(token);
    if (!shop) throw new UnauthorizedException(integrationError('INTEGRATION_SIGNATURE_INVALID', "The webhook does not carry a shop's token"));
    return { result: await this.events.receive(shop.storeId, body, request.rawBody ?? Buffer.alloc(0)) };
  }
}
