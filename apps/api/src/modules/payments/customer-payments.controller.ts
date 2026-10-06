// Nest
import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { CustomerOrderPaymentAnswer } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { Public } from '../auth/auth.decorators.js';
import { CustomerAuthGuard, type AuthenticatedCustomer } from '../customers/customer-auth.guard.js';
import { CurrentCustomer } from '../customers/customer.decorators.js';
import { OrderNumberPipe } from '../orders/order-number.pipe.js';
import { CustomerPayments } from './customer-payments.service.js';
import { CustomerOrderPaymentAnswerResponse } from './dto/payment.response.js';

/** Each call may talk to the shop's Asaas account: a bucket of its own, of the size of the cart's orders, keyed by address. */
const rateLimit = { max: env.CUSTOMER_ORDER_RATE_LIMIT_MAX, timeWindow: env.CUSTOMER_ORDER_RATE_LIMIT_WINDOW };

/**
 * A shopper's payment of one of their orders (BEELINK-204), at the shop's own Asaas account.
 * `@Public()` to the global guard and closed by `CustomerAuthGuard`, as their orders are.
 */
@ApiTags('customers')
@ApiBearerAuth()
@ApiNotFoundResponse({ description: "STORE_NOT_FOUND · ORDER_NOT_FOUND — another customer's order is not found, never forbidden" })
@ApiUnauthorizedResponse({ description: "AUTH_UNAUTHENTICATED — no shopper's token, a shopkeeper's, or another shop's" })
@Public()
@UseGuards(CustomerAuthGuard)
@Controller('stores/:storeSlug/customer/orders/:number/payment')
export class CustomerPaymentsController {
  constructor(private readonly payments: CustomerPayments) {}

  @Get()
  @ApiOperation({ summary: "The order's charge and what it is paid with: a Pix's code and QR, read from Asaas once and kept, or a card's hosted invoice" })
  @ApiOkResponse({ type: CustomerOrderPaymentAnswerResponse })
  read(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer, @Param('number', OrderNumberPipe) number: number): Promise<CustomerOrderPaymentAnswer> {
    return this.payments.read(storeSlug, customer.userId, number);
  }

  @Post()
  @RouteConfig({ rateLimit })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make sure the order has a charge good to pay: the one it has while that serves, else a new one — the one before removed from Asaas first' })
  @ApiOkResponse({ type: CustomerOrderPaymentAnswerResponse })
  @ApiConflictResponse({
    description:
      'PAYMENT_NOT_ONLINE · ORDER_CANCELLED · PAYMENT_AWAITING_TOTAL — the delivery fee is not agreed yet · PAYMENT_ALREADY_PAID · PAYMENT_IN_PROGRESS — another request is making it: read again · PAYMENT_BELOW_MINIMUM · PAYMENT_DOCUMENT_MISSING',
  })
  @ApiBadGatewayResponse({ description: 'PAYMENT_REFUSED — Asaas refused the charge; the shop reads why on the order' })
  @ApiServiceUnavailableResponse({ description: 'PAYMENT_UNAVAILABLE — the shop cannot be paid online right now' })
  @ApiTooManyRequestsResponse({ description: 'Too many from this address' })
  charge(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer, @Param('number', OrderNumberPipe) number: number): Promise<CustomerOrderPaymentAnswer> {
    return this.payments.charge(storeSlug, customer.userId, number);
  }
}
