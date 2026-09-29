// Nest
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
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

// App
import { env } from '../../shared/config/env.js';
import { Public } from '../auth/auth.decorators.js';
import { CustomerAuthGuard, type AuthenticatedCustomer } from '../customers/customer-auth.guard.js';
import { CurrentCustomer } from '../customers/customer.decorators.js';
import { OrderNumberPipe } from '../orders/order-number.pipe.js';
import { ConversationsService } from './conversations.service.js';
import { CustomerConversationResponse, CustomerConversationSummaryResponse, SendConversationMessageDto } from './dto/conversation.dto.js';

/** Keyed by address, like the cart's order: a valid account does not get to flood a shop's conversations from a script. */
const rateLimit = { max: env.CUSTOMER_MESSAGE_RATE_LIMIT_MAX, timeWindow: env.CUSTOMER_MESSAGE_RATE_LIMIT_WINDOW };

/**
 * A shopper's conversations with the shop, one per order of theirs. `@Public()` to the global guard,
 * which refuses a shopper's token by design, and closed by `CustomerAuthGuard`, which refuses a
 * shopkeeper's. Another customer's order is not found, never forbidden.
 */
@ApiTags('customers')
@ApiBearerAuth()
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · ORDER_NOT_FOUND' })
@ApiUnauthorizedResponse({ description: "AUTH_UNAUTHENTICATED — no shopper's token, a shopkeeper's, or another shop's" })
@Public()
@UseGuards(CustomerAuthGuard)
@Controller('stores/:storeSlug/customer')
export class CustomerConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get('conversations')
  @ApiOperation({ summary: "The shopper's conversations at this shop: those still taking messages first, then the latest" })
  @ApiOkResponse({ type: [CustomerConversationSummaryResponse] })
  list(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer): Promise<CustomerConversationSummaryResponse[]> {
    return this.conversations.customerList(storeSlug, customer.userId);
  }

  @Get('orders/:number/conversation')
  @ApiOperation({ summary: "One of the shopper's orders' conversation; empty until they write" })
  @ApiOkResponse({ type: CustomerConversationResponse })
  read(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param('number', OrderNumberPipe) number: number,
  ): Promise<CustomerConversationResponse> {
    return this.conversations.customerRead(storeSlug, customer.userId, number);
  }

  @Post('orders/:number/conversation/messages')
  @RouteConfig({ rateLimit })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Write to the shop about the order; the first message opens the conversation' })
  @ApiCreatedResponse({ type: CustomerConversationResponse })
  @ApiConflictResponse({ description: 'ORDER_CONVERSATION_CLOSED — the order was delivered or cancelled' })
  @ApiTooManyRequestsResponse({ description: 'Too many messages from this address' })
  send(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param('number', OrderNumberPipe) number: number,
    @Body() dto: SendConversationMessageDto,
  ): Promise<CustomerConversationResponse> {
    return this.conversations.customerSend(storeSlug, customer.userId, number, dto);
  }

  @Post('orders/:number/conversation/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "The shop's messages, read by the shopper now" })
  @ApiOkResponse({ type: CustomerConversationResponse })
  markRead(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param('number', OrderNumberPipe) number: number,
  ): Promise<CustomerConversationResponse> {
    return this.conversations.customerMarkRead(storeSlug, customer.userId, number);
  }
}
