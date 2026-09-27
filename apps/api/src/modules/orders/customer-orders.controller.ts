// Nest
import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { CustomerOrder } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { Public } from '../auth/auth.decorators.js';
import { CustomerAuthGuard, type AuthenticatedCustomer } from '../customers/customer-auth.guard.js';
import { CurrentCustomer } from '../customers/customer.decorators.js';
import { CustomerOrdersService } from './customer-orders.service.js';
import { CustomerOrderResponse, PlaceCustomerOrderDto } from './dto/customer-order.dto.js';

/** Keyed by address: a valid account does not get to fill a shop's panel from a script. */
const rateLimit = { max: env.CUSTOMER_ORDER_RATE_LIMIT_MAX, timeWindow: env.CUSTOMER_ORDER_RATE_LIMIT_WINDOW };

/**
 * A shopper's orders at a shop. `@Public()` to the global guard, which refuses a shopper's token by
 * design, and closed by `CustomerAuthGuard`, which refuses a shopkeeper's.
 */
@ApiTags('customers')
@ApiBearerAuth()
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiUnauthorizedResponse({ description: "AUTH_UNAUTHENTICATED — no shopper's token, a shopkeeper's, or another shop's" })
@Public()
@Controller('stores/:storeSlug/customer/orders')
export class CustomerOrdersController {
  constructor(private readonly orders: CustomerOrdersService) {}

  @Post()
  @UseGuards(CustomerAuthGuard)
  @RouteConfig({ rateLimit })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Place the cart as the shopper's order; it starts received, numbered and priced here" })
  @ApiCreatedResponse({ type: CustomerOrderResponse })
  @ApiBadRequestResponse({
    description: 'ORDER_DELIVERY_ADDRESS_MISSING · ORDER_VARIANT_INVALID · ORDER_ITEM_DUPLICATE · ORDER_PAYMENT_NOT_ACCEPTED · ORDER_TOTAL_TOO_LARGE',
  })
  @ApiConflictResponse({ description: 'ORDER_STOCK_INSUFFICIENT — `details` is `OrderStockDetails`' })
  @ApiTooManyRequestsResponse({ description: 'Too many orders from this address' })
  place(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: PlaceCustomerOrderDto,
  ): Promise<CustomerOrder> {
    return this.orders.place(storeSlug, customer.userId, dto);
  }
}
