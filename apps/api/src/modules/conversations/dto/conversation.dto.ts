// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

// Types
import type {
  ConversationAuthor,
  ConversationCustomer,
  ConversationLastMessage,
  ConversationMessage,
  ConversationOrder,
  CustomerConversation,
  CustomerConversationSummary,
  OrderFulfillment,
  OrderStatus,
  SendConversationMessagePayload,
  ShopConversation,
  ShopConversationFilter,
  ShopConversationPage,
  ShopConversationQuery,
  ShopConversationSummary,
  ShopConversationUnread,
} from '@harness-monorepo/contracts';

// App
import { MaxCodePoints } from '../../../shared/http/max-code-points.js';
import { trim } from '../../stores/dto/store-fields.dto.js';
import { ORDER_FULFILLMENTS, ORDER_STATUSES } from '../../orders/orders.constants.js';
import { MESSAGE_MAX_LENGTH, SHOP_CONVERSATION_FILTERS, SHOP_CONVERSATIONS_PAGE_MAX } from '../conversations.constants.js';

const AUTHORS = ['CUSTOMER', 'SHOP'] as const satisfies readonly ConversationAuthor[];

/** A message, trimmed: blank is nothing to send. Stored as written — plain text, drawn as text by both sides. */
export class SendConversationMessageDto implements SendConversationMessagePayload {
  @ApiProperty({ minLength: 1, maxLength: MESSAGE_MAX_LENGTH, description: 'Plain text; never drawn as HTML.' })
  @IsString()
  @trim
  @MinLength(1)
  @MaxCodePoints(MESSAGE_MAX_LENGTH)
  body!: string;
}

/** How the panel asks for its conversations. Absent means all, the latest message first. */
export class ListShopConversationsDto implements ShopConversationQuery {
  @ApiPropertyOptional({ enum: SHOP_CONVERSATION_FILTERS, default: 'ALL' })
  @IsOptional()
  @IsIn(SHOP_CONVERSATION_FILTERS)
  filter?: ShopConversationFilter;

  @ApiPropertyOptional({ description: 'An order number, or part of the customer’s name.' })
  @IsOptional()
  @IsString()
  @trim
  @MaxLength(120)
  q?: string;

  // `@Type(() => Number)` and not the pipe's implicit conversion — apps/api/AGENTS.md, rule 6.
  @ApiPropertyOptional({ minimum: 1, maximum: SHOP_CONVERSATIONS_PAGE_MAX, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SHOP_CONVERSATIONS_PAGE_MAX)
  page?: number;
}

const KINDS = ['MESSAGE', 'STATUS'] as const satisfies readonly ConversationMessage['kind'][];

/**
 * A message or a status notice, as Swagger draws it: one shape with the fields of both. The wire type
 * is the union in packages/contracts — a class cannot implement a union, so the properties that hold
 * one are typed with the contract, and this class only documents it.
 */
export class ConversationMessageResponse {
  @ApiProperty({ enum: KINDS, description: 'MESSAGE is written by a side; STATUS tells of the order moving (BEELINK-236).' }) kind!: ConversationMessage['kind'];
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiPropertyOptional({ enum: AUTHORS, description: 'On a MESSAGE.' }) author?: ConversationAuthor;
  @ApiPropertyOptional({ description: 'On a MESSAGE: plain text, never drawn as HTML.' }) body?: string;
  @ApiPropertyOptional({ enum: ORDER_STATUSES, description: 'On a STATUS: the status the order moved to; each side words it.' }) status?: OrderStatus;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time', nullable: true, type: String, description: 'When the other side read it — the customer, for a STATUS.' }) readAt!: string | null;
}

export class ConversationOrderResponse implements ConversationOrder {
  @ApiProperty() number!: number;
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty({ enum: ORDER_FULFILLMENTS }) fulfillment!: OrderFulfillment;
  @ApiProperty({ description: 'Takes messages while the order is on its way.' }) open!: boolean;
}

/** The last message, as Swagger draws it; see ConversationMessageResponse for why it implements nothing. */
export class ConversationLastMessageResponse {
  @ApiProperty({ enum: KINDS }) kind!: ConversationLastMessage['kind'];
  @ApiPropertyOptional({ enum: AUTHORS, description: 'On a MESSAGE.' }) author?: ConversationAuthor;
  @ApiPropertyOptional({ description: 'On a MESSAGE.' }) body?: string;
  @ApiPropertyOptional({ enum: ORDER_STATUSES, description: 'On a STATUS.' }) status?: OrderStatus;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class ConversationCustomerResponse implements ConversationCustomer {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

export class CustomerConversationResponse implements CustomerConversation {
  @ApiProperty({ type: ConversationOrderResponse }) order!: ConversationOrderResponse;
  @ApiProperty({ type: [ConversationMessageResponse], description: 'Oldest first.' }) messages!: ConversationMessage[];
  @ApiProperty({ description: "The shop's messages and the status notices the customer has not read." }) unread!: number;
}

export class CustomerConversationSummaryResponse implements CustomerConversationSummary {
  @ApiProperty({ type: ConversationOrderResponse }) order!: ConversationOrderResponse;
  @ApiProperty({ type: ConversationLastMessageResponse }) lastMessage!: ConversationLastMessage;
  @ApiProperty() unread!: number;
}

export class ShopConversationResponse implements ShopConversation {
  @ApiProperty({ type: ConversationOrderResponse }) order!: ConversationOrderResponse;
  @ApiProperty({ type: ConversationCustomerResponse }) customer!: ConversationCustomerResponse;
  @ApiProperty({ type: [ConversationMessageResponse], description: 'Oldest first.' }) messages!: ConversationMessage[];
  @ApiProperty({ description: "The customer's messages the shop has not read; a status notice never counts." }) unread!: number;
}

export class ShopConversationSummaryResponse implements ShopConversationSummary {
  @ApiProperty({ type: ConversationOrderResponse }) order!: ConversationOrderResponse;
  @ApiProperty({ type: ConversationCustomerResponse }) customer!: ConversationCustomerResponse;
  @ApiProperty({ type: ConversationLastMessageResponse }) lastMessage!: ConversationLastMessage;
  @ApiProperty() unread!: number;
}

export class ShopConversationPageResponse implements ShopConversationPage {
  @ApiProperty({ type: [ShopConversationSummaryResponse] }) conversations!: ShopConversationSummaryResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class ShopConversationUnreadResponse implements ShopConversationUnread {
  @ApiProperty() messages!: number;
  @ApiProperty() conversations!: number;
}
