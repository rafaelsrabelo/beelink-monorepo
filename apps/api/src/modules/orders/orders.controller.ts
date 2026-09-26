// Nest
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

// App
import { CurrentUser } from '../auth/auth.decorators.js';
import { CreateOrderDto, ListOrdersDto, UpdateOrderStatusDto } from './dto/order.dto.js';
import { OrderPageResponse, OrderResponse } from './dto/order.response.js';
import { OrderNumberPipe } from './order-number.pipe.js';
import { OrdersService } from './orders.service.js';

/** The owner's side of a shop's orders. Closed, like every panel route; a shopper's token is refused. */
@ApiTags('orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · ORDER_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register an order the shop closed elsewhere; it starts accepted, numbered and priced here' })
  @ApiCreatedResponse({ type: OrderResponse })
  @ApiBadRequestResponse({
    description:
      'ORDER_CUSTOMER_NOT_FOUND · ORDER_VARIANT_INVALID · ORDER_ITEM_DUPLICATE · ORDER_PAYMENT_NOT_ACCEPTED · ORDER_PLACED_IN_FUTURE · ORDER_DISCOUNT_TOO_LARGE · ORDER_TOTAL_TOO_LARGE',
  })
  create(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponse> {
    return this.orders.create(storeSlug, current.id, dto);
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

  @Patch(':number/status')
  @ApiOperation({ summary: 'Move the order to another status; nothing leaves CANCELLED' })
  @ApiOkResponse({ type: OrderResponse })
  @ApiConflictResponse({ description: 'ORDER_CANCELLED · ORDER_STATUS_UNCHANGED' })
  updateStatus(
    @Param('storeSlug') storeSlug: string,
    @Param('number', OrderNumberPipe) number: number,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderResponse> {
    return this.orders.updateStatus(storeSlug, current.id, number, dto);
  }
}
