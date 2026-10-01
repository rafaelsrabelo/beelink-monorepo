// Nest
import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';

// Types
import type { OrderQuote } from '@harness-monorepo/contracts';

// App
import { Public } from '../auth/auth.decorators.js';
import { STOREFRONT_RATE_LIMIT } from '../stores/stores.constants.js';
import { CartQuoteDto, OrderQuoteResponse } from './dto/order-quote.dto.js';
import { OrderQuotes } from './order-quote.service.js';

/**
 * A visitor's cart, priced: the lines at the catalogue's price and what the shop's promotions take
 * off them. Open to anyone, like the cart's own read beside it — and for that reason it takes no
 * coupon: a route that answers whether a code exists is a way to guess a shop's codes.
 *
 * Nobody is identified here, so a promotion for a first purchase (BEELINK-245) is not on the lines:
 * the answer announces it, with what it would take off, for the cart to say it is theirs once they
 * sign in. The signed-in shopper's cart is priced at their own door, `customer/cart/quote`.
 *
 * A POST, unlike the cart's read: the lines travel in the body, and the answer depends on the hour,
 * so there is nothing to cache by address.
 */
@ApiTags('storefront')
@Controller('stores/:storeSlug/cart')
export class CartQuoteController {
  constructor(private readonly quotes: OrderQuotes) {}

  @Post('quote')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit: STOREFRONT_RATE_LIMIT })
  @ApiOperation({ summary: "A cart priced with the shop's promotions: each line's discount and the totals, and a first-purchase promotion announced" })
  @ApiOkResponse({ type: OrderQuoteResponse })
  @ApiBadRequestResponse({ description: 'ORDER_VARIANT_INVALID · ORDER_ITEM_DUPLICATE · ORDER_TOTAL_TOO_LARGE' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  quote(@Param('storeSlug') storeSlug: string, @Body() dto: CartQuoteDto): Promise<OrderQuote> {
    return this.quotes.forCart(storeSlug, dto);
  }
}
