// Nest
import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { OrderQuote } from '@harness-monorepo/contracts';

// App
import { Public } from '../auth/auth.decorators.js';
import { CustomerAuthGuard, type AuthenticatedCustomer } from '../customers/customer-auth.guard.js';
import { CurrentCustomer } from '../customers/customer.decorators.js';
import { STOREFRONT_RATE_LIMIT } from '../stores/stores.constants.js';
import { CustomerCartQuoteDto, OrderQuoteResponse } from './dto/order-quote.dto.js';
import { OrderQuotes } from './order-quote.service.js';

/**
 * The signed-in shopper's cart, priced as theirs (BEELINK-245). The visitor's quote is the same for
 * everyone; this one knows who asks, so a promotion for a first purchase is on the lines while no
 * order of theirs stands, and announced with the reason once one does.
 *
 * It takes no coupon, which is why it is limited as the shop window is and not as the checkout's
 * quote beside the orders: that one answers whether a code exists, so its calls are few, and a cart
 * priced again at every change of a quantity would spend them.
 *
 * `@Public()` to the global guard and closed by `CustomerAuthGuard`, as the shopper's orders are.
 */
@ApiTags('customers')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "AUTH_UNAUTHENTICATED — no shopper's token, a shopkeeper's, or another shop's" })
@Public()
@UseGuards(CustomerAuthGuard)
@Controller('stores/:storeSlug/customer/cart')
export class CustomerCartQuoteController {
  constructor(private readonly quotes: OrderQuotes) {}

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit: STOREFRONT_RATE_LIMIT })
  @ApiOperation({ summary: "The shopper's cart priced as their order would be, with no coupon: each line's discount, the totals, and a first-purchase promotion applied or announced" })
  @ApiOkResponse({ type: OrderQuoteResponse })
  @ApiBadRequestResponse({ description: 'ORDER_VARIANT_INVALID · ORDER_ITEM_DUPLICATE · ORDER_TOTAL_TOO_LARGE' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  quote(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer, @Body() dto: CustomerCartQuoteDto): Promise<OrderQuote> {
    return this.quotes.forCustomer(storeSlug, customer.userId, dto);
  }
}
