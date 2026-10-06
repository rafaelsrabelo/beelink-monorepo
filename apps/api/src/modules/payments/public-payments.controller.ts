// Nest
import { Controller, Get, Param } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';

// Types
import type { StorefrontPaymentOptions } from '@harness-monorepo/contracts';

// App
import { Public } from '../auth/auth.decorators.js';
import { STOREFRONT_RATE_LIMIT } from '../stores/stores.constants.js';
import { StoresService } from '../stores/stores.service.js';
import { StorefrontPaymentOptionsResponse } from './dto/payment.response.js';
import { OrderPayments } from './order-payments.service.js';
import { paymentOptionsOf } from './payment-options.js';

/**
 * How a shop's checkout is paid (BEELINK-205), read by anyone: the ways it charges online and
 * whether paying on delivery stands. A route of its own rather than a field of the shop window —
 * it is read from the same acceptance an order is placed against, which the stores cannot reach.
 */
@ApiTags('storefront')
@Controller('stores/:storeSlug/payment-options')
export class PublicPaymentsController {
  constructor(
    private readonly stores: StoresService,
    private readonly payments: OrderPayments,
  ) {}

  @Get()
  @Public()
  @RouteConfig({ rateLimit: STOREFRONT_RATE_LIMIT })
  @ApiOperation({ summary: "What the shop charges online now — Pix, credit card and its instalments — and whether paying on delivery stands; nothing of its Asaas account" })
  @ApiOkResponse({ type: StorefrontPaymentOptionsResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  async read(@Param('storeSlug') storeSlug: string): Promise<StorefrontPaymentOptions> {
    return paymentOptionsOf(await this.payments.acceptanceOf(await this.stores.publicStoreId(storeSlug)));
  }
}
