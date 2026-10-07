// Nest
import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { CustomerOffers } from '@harness-monorepo/contracts';

// App
import { Public } from '../auth/auth.decorators.js';
import { CustomerAuthGuard, type AuthenticatedCustomer } from '../customers/customer-auth.guard.js';
import { CurrentCustomer } from '../customers/customer.decorators.js';
import { CustomerOffersResponse } from '../promotions/dto/offers.response.js';
import { STOREFRONT_RATE_LIMIT } from '../stores/stores.constants.js';
import { CustomerOffersReader } from './customer-offers.service.js';
import { CustomerOffersDto } from './dto/order-quote.dto.js';

/**
 * The signed-in shopper's offers at the shop: the first-order benefit the shop window shows them and
 * the coupons their cart may take. A shopper's alone — it names codes, and whether a code exists is
 * told only to an identified customer — and only ever the codes the shopkeeper chose to show, so
 * no body sent here finds one that was not.
 *
 * Limited as the shop window is, like the cart's quote without a code beside it: it is asked again
 * as a cart changes, and answers about no code a caller can guess at.
 *
 * `@Public()` to the global guard and closed by `CustomerAuthGuard`, as the shopper's orders are.
 */
@ApiTags('customers')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "AUTH_UNAUTHENTICATED — no shopper's token, a shopkeeper's, or another shop's" })
@Public()
@UseGuards(CustomerAuthGuard)
@Controller('stores/:storeSlug/customer/offers')
export class CustomerOffersController {
  constructor(private readonly offers: CustomerOffersReader) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit: STOREFRONT_RATE_LIMIT })
  @ApiOperation({ summary: "The shopper's offers: whether an order of theirs stands, the first-order benefit to show, and the shown coupons the cart sent may take" })
  @ApiOkResponse({ type: CustomerOffersResponse })
  @ApiBadRequestResponse({ description: 'ORDER_VARIANT_INVALID · ORDER_ITEM_DUPLICATE · ORDER_TOTAL_TOO_LARGE' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  read(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer, @Body() dto: CustomerOffersDto): Promise<CustomerOffers> {
    return this.offers.forCustomer(storeSlug, customer.userId, dto);
  }
}
