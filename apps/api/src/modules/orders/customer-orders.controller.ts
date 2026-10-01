// Nest
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { CustomerOrder, CustomerOrderPage, CustomerReorder, OrderQuote } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { Public } from '../auth/auth.decorators.js';
import { CustomerAuthGuard, type AuthenticatedCustomer } from '../customers/customer-auth.guard.js';
import { CurrentCustomer } from '../customers/customer.decorators.js';
import { CustomerOrdersService } from './customer-orders.service.js';
import { CustomerOrderPageResponse, CustomerOrderResponse, CustomerReorderResponse, ListCustomerOrdersDto, PlaceCustomerOrderDto } from './dto/customer-order.dto.js';
import { CustomerOrderQuoteDto, OrderQuoteResponse } from './dto/order-quote.dto.js';
import { OrderNumberPipe } from './order-number.pipe.js';
import { OrderQuotes } from './order-quote.service.js';

/** Keyed by address: a valid account does not get to fill a shop's panel from a script. */
const rateLimit = { max: env.CUSTOMER_ORDER_RATE_LIMIT_MAX, timeWindow: env.CUSTOMER_ORDER_RATE_LIMIT_WINDOW };

/** The quote says whether a coupon's code exists: a bucket of its own, so pricing never spends an order's. */
const quoteRateLimit = { max: env.CUSTOMER_QUOTE_RATE_LIMIT_MAX, timeWindow: env.CUSTOMER_QUOTE_RATE_LIMIT_WINDOW };

/**
 * A shopper's orders at a shop — their own, including those the shop registered for them. `@Public()`
 * to the global guard, which refuses a shopper's token by design, and closed by `CustomerAuthGuard`,
 * which refuses a shopkeeper's.
 */
@ApiTags('customers')
@ApiBearerAuth()
@ApiNotFoundResponse({ description: "STORE_NOT_FOUND · ORDER_NOT_FOUND — another customer's order is not found, never forbidden" })
@ApiUnauthorizedResponse({ description: "AUTH_UNAUTHENTICATED — no shopper's token, a shopkeeper's, or another shop's" })
@Public()
@UseGuards(CustomerAuthGuard)
@Controller('stores/:storeSlug/customer/orders')
export class CustomerOrdersController {
  constructor(
    private readonly orders: CustomerOrdersService,
    private readonly quotes: OrderQuotes,
  ) {}

  @Get()
  @ApiOperation({ summary: "The shopper's orders at this shop, most recent first, with the count of each tab" })
  @ApiOkResponse({ type: CustomerOrderPageResponse })
  list(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Query() query: ListCustomerOrdersDto,
  ): Promise<CustomerOrderPage> {
    return this.orders.list(storeSlug, customer.userId, query);
  }

  @Get(':number')
  @ApiOperation({ summary: "One of the shopper's orders: its lines, totals, address, payment and timeline" })
  @ApiOkResponse({ type: CustomerOrderResponse })
  get(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param('number', OrderNumberPipe) number: number,
  ): Promise<CustomerOrder> {
    return this.orders.get(storeSlug, customer.userId, number);
  }

  @Get(':number/reorder')
  @ApiOperation({ summary: "One of the shopper's orders against today's catalogue: the lines that go back into the cart, and those that stay out and why" })
  @ApiOkResponse({ type: CustomerReorderResponse })
  reorder(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param('number', OrderNumberPipe) number: number,
  ): Promise<CustomerReorder> {
    return this.orders.reorder(storeSlug, customer.userId, number);
  }

  @Post(':number/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order the shop has not accepted yet; its stock goes back' })
  @ApiOkResponse({ type: CustomerOrderResponse })
  @ApiConflictResponse({ description: 'ORDER_NOT_CANCELLABLE — accepted or further along: the shop cancels it now · ORDER_CANCELLED — already cancelled' })
  cancel(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param('number', OrderNumberPipe) number: number,
  ): Promise<CustomerOrder> {
    return this.orders.cancel(storeSlug, customer.userId, number);
  }

  @Post('quote')
  @RouteConfig({ rateLimit: quoteRateLimit })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "The cart as the shopper's order would be priced, and whether the coupon they typed is taken — with the reason when it is not" })
  @ApiOkResponse({ type: OrderQuoteResponse })
  @ApiBadRequestResponse({ description: 'ORDER_VARIANT_INVALID · ORDER_ITEM_DUPLICATE · ORDER_TOTAL_TOO_LARGE' })
  @ApiTooManyRequestsResponse({ description: 'Too many quotes from this address' })
  quote(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer, @Body() dto: CustomerOrderQuoteDto): Promise<OrderQuote> {
    return this.quotes.forCustomer(storeSlug, customer.userId, dto);
  }

  @Post()
  @RouteConfig({ rateLimit })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Place the cart as the shopper's order; it starts received, numbered and priced here" })
  @ApiCreatedResponse({ type: CustomerOrderResponse })
  @ApiBadRequestResponse({
    description: 'ORDER_DELIVERY_ADDRESS_MISSING · ORDER_ADDRESS_NOT_FOUND · ORDER_VARIANT_INVALID · ORDER_ITEM_DUPLICATE · ORDER_PAYMENT_NOT_ACCEPTED · ORDER_TOTAL_TOO_LARGE',
  })
  @ApiConflictResponse({ description: 'ORDER_STOCK_INSUFFICIENT — `details` is `OrderStockDetails` · ORDER_COUPON_REFUSED — `details` is `OrderCouponRefusedDetails`' })
  @ApiTooManyRequestsResponse({ description: 'Too many orders from this address' })
  place(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: PlaceCustomerOrderDto,
  ): Promise<CustomerOrder> {
    return this.orders.place(storeSlug, customer.userId, dto);
  }
}
