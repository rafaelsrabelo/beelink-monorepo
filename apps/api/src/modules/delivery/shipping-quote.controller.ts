// Nest
import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';

// Types
import type { ShippingQuote } from '@harness-monorepo/contracts';

// App
import { Public } from '../auth/auth.decorators.js';
import { STOREFRONT_RATE_LIMIT } from '../stores/stores.constants.js';
import { ShippingQuoteResponse } from './dto/delivery.response.js';
import { ShippingQuoteDto } from './dto/shipping-quote.dto.js';
import { ShippingQuotes } from './shipping-quote.service.js';

/**
 * How a cart gets to an address, as the shop window asks — the checkout, and the product page by CEP.
 * Open to anyone, like the cart's own quote, and limited like it: placing an address on the map is a
 * billed call, which the quote spends only when a band needs the distance, and remembers.
 */
@ApiTags('storefront')
@Controller('stores/:storeSlug/shipping')
export class ShippingQuoteController {
  constructor(private readonly quotes: ShippingQuotes) {}

  @Post('quote')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit: STOREFRONT_RATE_LIMIT })
  @ApiOperation({ summary: "The shop's ways to get this cart to this address: its own delivery by distance, and pickup" })
  @ApiOkResponse({ type: ShippingQuoteResponse })
  @ApiBadRequestResponse({ description: 'SHIPPING_DESTINATION_INVALID · ORDER_VARIANT_INVALID · ORDER_ITEM_DUPLICATE' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  quote(@Param('storeSlug') storeSlug: string, @Body() dto: ShippingQuoteDto): Promise<ShippingQuote> {
    return this.quotes.forShopWindow(storeSlug, dto);
  }
}
