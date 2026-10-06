// Nest
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { OrderQuote } from '@harness-monorepo/contracts';
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

// App
import { CurrentUser } from '../auth/auth.decorators.js';
import { SetOrderDeliveryFeeDto } from './dto/order-delivery-fee.dto.js';
import { CreateOrderDto, ListOrdersDto, OrderDeliveryDto, UpdateOrderStatusDto } from './dto/order.dto.js';
import { OrderQuoteResponse, ShopOrderQuoteDto } from './dto/order-quote.dto.js';
import { OrderPageResponse, OrderResponse } from './dto/order.response.js';
import { RefundOrderDto } from '../payments/dto/refund-order.dto.js';
import { OrderNumberPipe } from './order-number.pipe.js';
import { OrderQuotes } from './order-quote.service.js';
import { OrdersService } from './orders.service.js';

/** The owner's side of a shop's orders. Closed, like every panel route; a shopper's token is refused. */
@ApiTags('orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · ORDER_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly quotes: OrderQuotes,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register an order the shop closed elsewhere; it starts accepted, numbered and priced here' })
  @ApiCreatedResponse({ type: OrderResponse })
  @ApiBadRequestResponse({
    description:
      'ORDER_CUSTOMER_NOT_FOUND · ORDER_DELIVERY_ADDRESS_MISSING · ORDER_VARIANT_INVALID · ORDER_ITEM_DUPLICATE · ORDER_PAYMENT_NOT_ACCEPTED · ORDER_PLACED_IN_FUTURE · ORDER_DISCOUNT_TOO_LARGE · ORDER_TOTAL_TOO_LARGE',
  })
  @ApiConflictResponse({ description: 'ORDER_STOCK_INSUFFICIENT · ORDER_COUPON_REFUSED — `details` is `OrderCouponRefusedDetails`' })
  create(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponse> {
    return this.orders.create(storeSlug, current.id, dto);
  }

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'What a sale would be registered for: the promotions, the coupon and the typed discount, before it is an order' })
  @ApiOkResponse({ type: OrderQuoteResponse })
  @ApiBadRequestResponse({
    description: 'ORDER_CUSTOMER_NOT_FOUND · ORDER_VARIANT_INVALID · ORDER_ITEM_DUPLICATE · ORDER_PLACED_IN_FUTURE · ORDER_DISCOUNT_TOO_LARGE · ORDER_TOTAL_TOO_LARGE',
  })
  quote(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: ShopOrderQuoteDto): Promise<OrderQuote> {
    return this.quotes.forShop(storeSlug, current.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "One page of the shop's orders, most recently placed first" })
  @ApiOkResponse({ type: OrderPageResponse })
  list(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Query() query: ListOrdersDto,
  ): Promise<OrderPageResponse> {
    return this.orders.list(storeSlug, current.id, query);
  }

  @Get(':number')
  @ApiOperation({ summary: 'One order, by its number in the shop' })
  @ApiOkResponse({ type: OrderResponse })
  get(
    @Param('storeSlug') storeSlug: string,
    @Param('number', OrderNumberPipe) number: number,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<OrderResponse> {
    return this.orders.get(storeSlug, current.id, number);
  }

  @Put(':number/delivery')
  @ApiOperation({ summary: 'Tell how a delivery goes — who brings it, its tracking, its window — replacing what was told' })
  @ApiOkResponse({ type: OrderResponse })
  @ApiBadRequestResponse({ description: 'ORDER_DELIVERY_FOR_PICKUP — a pick-up has no delivery · ORDER_DELIVERY_WINDOW_INVALID' })
  setDelivery(
    @Param('storeSlug') storeSlug: string,
    @Param('number', OrderNumberPipe) number: number,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: OrderDeliveryDto,
  ): Promise<OrderResponse> {
    return this.orders.setDelivery(storeSlug, current.id, number, dto);
  }

  @Put(':number/delivery-fee')
  @ApiOperation({ summary: 'Tell the fee agreed for a delivery; the total and the customer’s books follow (BEELINK-170)' })
  @ApiOkResponse({ type: OrderResponse })
  @ApiBadRequestResponse({ description: 'ORDER_DELIVERY_FOR_PICKUP — a pick-up has no fee · ORDER_DISCOUNT_TOO_LARGE · ORDER_TOTAL_TOO_LARGE' })
  @ApiConflictResponse({ description: 'ORDER_CANCELLED · ORDER_PAID — a paid order keeps its total until it is refunded' })
  setDeliveryFee(
    @Param('storeSlug') storeSlug: string,
    @Param('number', OrderNumberPipe) number: number,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: SetOrderDeliveryFeeDto,
  ): Promise<OrderResponse> {
    return this.orders.setDeliveryFee(storeSlug, current.id, number, dto);
  }

  @Delete(':number/delivery')
  @ApiOperation({ summary: "Take back what was told of the delivery; the order reads as one nobody told yet" })
  @ApiOkResponse({ type: OrderResponse })
  clearDelivery(
    @Param('storeSlug') storeSlug: string,
    @Param('number', OrderNumberPipe) number: number,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<OrderResponse> {
    return this.orders.clearDelivery(storeSlug, current.id, number);
  }

  @Post(':number/payment/seen')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "The shop opened a paid order: the bell stops telling of its payment (BEELINK-207). Saying it again, or of an order with no payment, changes nothing" })
  @ApiNoContentResponse()
  seePayment(
    @Param('storeSlug') storeSlug: string,
    @Param('number', OrderNumberPipe) number: number,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<void> {
    return this.orders.seePayment(storeSlug, current.id, number);
  }

  @Post(':number/refunds')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Give back money of the order's payment, whole or in part, or a payment it did not ask for (BEELINK-208); the refund is asked of the shop's Asaas account, once" })
  @ApiOkResponse({ type: OrderResponse })
  @ApiConflictResponse({ description: 'REFUND_NOTHING_TO_REFUND · REFUND_EXCEEDS (details: refundableCents) · REFUND_STALE — what is left changed since the screen read it · REFUND_IN_PROGRESS · REFUND_NOT_READY — Asaas does not let the charge be refunded now' })
  @ApiBadGatewayResponse({ description: "REFUND_NO_BALANCE — the Asaas account has not the balance · REFUND_REFUSED (details: reason, in Asaas's words)" })
  @ApiServiceUnavailableResponse({ description: 'REFUND_UNCONFIRMED — Asaas did not answer and the charge does not show the refund yet · PAYMENT_UNAVAILABLE' })
  refund(
    @Param('storeSlug') storeSlug: string,
    @Param('number', OrderNumberPipe) number: number,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: RefundOrderDto,
  ): Promise<OrderResponse> {
    return this.orders.refund(storeSlug, current.id, number, dto);
  }

  @Patch(':number/status')
  @ApiOperation({ summary: 'Move the order to another status; nothing leaves CANCELLED. Cancelling a paid order carries its refund, asked of Asaas first (BEELINK-208)' })
  @ApiOkResponse({ type: OrderResponse })
  @ApiConflictResponse({ description: 'ORDER_CANCELLED · ORDER_STATUS_UNCHANGED · ORDER_PAID — a paid order is cancelled only with `refund` · and what a refund is refused with (`POST …/refunds`)' })
  updateStatus(
    @Param('storeSlug') storeSlug: string,
    @Param('number', OrderNumberPipe) number: number,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderResponse> {
    return this.orders.updateStatus(storeSlug, current.id, number, dto);
  }
}
