// Nest
import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req, UnauthorizedException, type RawBodyRequest } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

// Libs
import type { FastifyRequest } from 'fastify';

// App
import { Public } from '../auth/auth.decorators.js';
import { BillingEvents, type BillingEventReceipt } from './billing-events.service.js';
import { billingError } from './billing.constants.js';
import { carriesPlatformToken } from './platform-webhook.config.js';

/**
 * Where Asaas tells of bee-link's own account (BEELINK-221): the webhook the API registers there, at
 * `https://<WEB_DOMAIN>/api/billing/asaas/webhook` — the web's route hands the body over as it
 * arrived. A request without this deployment's token is refused before anything is written.
 *
 * It answers 200 once the event is written, and never waits for what the event leads to: Asaas pauses
 * a webhook after fifteen failures in a row, so nothing that can fail later is done here. A body it
 * cannot make sense of is still written; one about no page of bee-link's is answered and left alone.
 */
@ApiExcludeController()
@Controller('billing/asaas/webhook')
export class BillingWebhookController {
  constructor(private readonly events: BillingEvents) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  async receive(@Req() request: RawBodyRequest<FastifyRequest>, @Headers('asaas-access-token') token: string | undefined, @Body() body: unknown): Promise<{ result: BillingEventReceipt }> {
    if (!carriesPlatformToken(token)) throw new UnauthorizedException(billingError('BILLING_WEBHOOK_TOKEN_INVALID', "The webhook does not carry bee-link's own token"));
    return { result: await this.events.receive(body, request.rawBody ?? Buffer.alloc(0)) };
  }
}
