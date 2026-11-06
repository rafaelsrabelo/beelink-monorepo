// Nest
import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';

// Types
import type { CustomerCheckoutAnswer } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { Public } from '../auth/auth.decorators.js';
import { CustomerCheckoutService } from './customer-checkout.service.js';
import { CustomerCheckoutAnswerResponse, CustomerCheckoutDto } from './dto/customer-checkout.dto.js';

/** Keyed by IP, as the account door is: it opens sessions that place orders. */
const rateLimit = { max: env.AUTH_RATE_LIMIT_MAX, timeWindow: env.AUTH_RATE_LIMIT_WINDOW };

/**
 * A visitor's checkout door (plan 2026-11-06--P0-checkout-sem-codigo): who is buying, with no code and no
 * account. `@Public()`, since nobody is signed in. Closed to a page locked for want of payment
 * (BEELINK-223): it exists to place an order, and a locked shop window takes none.
 */
@ApiTags('customers')
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
@Public()
@Controller('stores/:storeSlug/customer/checkout')
export class CustomerCheckoutController {
  constructor(private readonly checkout: CustomerCheckoutService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: "A visitor's name, e-mail and WhatsApp open a purchase session — the same answer for any of them" })
  @ApiOkResponse({ type: CustomerCheckoutAnswerResponse })
  @ApiBadRequestResponse({ description: 'A name, an e-mail or a WhatsApp that is not one' })
  identify(@Param('storeSlug') storeSlug: string, @Body() dto: CustomerCheckoutDto): Promise<CustomerCheckoutAnswer> {
    return this.checkout.identify(storeSlug, dto);
  }
}
