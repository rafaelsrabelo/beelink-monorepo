// Nest
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import {
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
import { OrderNumberPipe } from '../orders/order-number.pipe.js';
import { ConversationsService } from './conversations.service.js';
import {
  ListShopConversationsDto,
  SendConversationMessageDto,
  ShopConversationPageResponse,
  ShopConversationResponse,
  ShopConversationUnreadResponse,
} from './dto/conversation.dto.js';

/** The shop's side of its orders' conversations. Closed, like every panel route; a shopper's token is refused. */
@ApiTags('conversations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · ORDER_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get('conversations')
  @ApiOperation({ summary: "A page of the shop's conversations, latest message first: open, unread or all, by order number or customer" })
  @ApiOkResponse({ type: ShopConversationPageResponse })
  list(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Query() query: ListShopConversationsDto): Promise<ShopConversationPageResponse> {
    return this.conversations.shopList(storeSlug, current.id, query);
  }

  @Get('conversations/unread')
  @ApiOperation({ summary: "The customers' messages the shop has not read, and the conversations they are in" })
  @ApiOkResponse({ type: ShopConversationUnreadResponse })
  unread(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<ShopConversationUnreadResponse> {
    return this.conversations.shopUnread(storeSlug, current.id);
  }

  @Get('orders/:number/conversation')
  @ApiOperation({ summary: "An order's conversation; empty while its customer has not written" })
  @ApiOkResponse({ type: ShopConversationResponse })
  read(
    @Param('storeSlug') storeSlug: string,
    @Param('number', OrderNumberPipe) number: number,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<ShopConversationResponse> {
    return this.conversations.shopRead(storeSlug, current.id, number);
  }

  @Post('orders/:number/conversation/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Answer the customer; the conversation answered, as it now stands' })
  @ApiCreatedResponse({ type: ShopConversationResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · ORDER_NOT_FOUND · ORDER_CONVERSATION_NOT_FOUND — the customer has not opened one' })
  @ApiConflictResponse({ description: 'ORDER_CONVERSATION_CLOSED — the order was delivered or cancelled' })
  send(
    @Param('storeSlug') storeSlug: string,
    @Param('number', OrderNumberPipe) number: number,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: SendConversationMessageDto,
  ): Promise<ShopConversationResponse> {
    return this.conversations.shopSend(storeSlug, current.id, number, dto);
  }

  @Post('orders/:number/conversation/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "The customer's messages, read by the shop now" })
  @ApiOkResponse({ type: ShopConversationResponse })
  markRead(
    @Param('storeSlug') storeSlug: string,
    @Param('number', OrderNumberPipe) number: number,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<ShopConversationResponse> {
    return this.conversations.shopMarkRead(storeSlug, current.id, number);
  }
}
