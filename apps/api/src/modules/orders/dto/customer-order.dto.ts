// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

// Types
import type {
  CustomerOrder,
  CustomerOrderEvent,
  CustomerOrderItem,
  CustomerOrderListQuery,
  CustomerOrderPage,
  CustomerReorder,
  CustomerReorderLeft,
  CustomerReorderLine,
  ReorderLeftReason,
  CustomerOrderSituation,
  CustomerOrderSummary,
  OrderFulfillment,
  OrderPlacedBy,
  OrderStatus,
  PaymentMethod,
  PlaceCustomerOrderPayload,
} from '@harness-monorepo/contracts';

// App
import { blankToNull, trim } from '../../stores/dto/store-fields.dto.js';
import { PAYMENT_METHODS } from '../../stores/stores.constants.js';
import {
  CUSTOMER_ORDER_SITUATIONS,
  CUSTOMER_ORDERS_PAGE_SIZE,
  CUSTOMER_ORDERS_PAGE_SIZE_MAX,
  ORDER_FULFILLMENTS,
  ORDER_ITEMS_MAX,
  ORDER_STATUSES,
  ORDERS_PAGE_MAX,
} from '../orders.constants.js';
import { OrderItemDto } from './order.dto.js';
import { OrderDeliveryAddressResponse, OrderDeliveryResponse } from './order.response.js';

const SITUATIONS = Object.keys(CUSTOMER_ORDER_SITUATIONS) as CustomerOrderSituation[];
const SIDES = ['CUSTOMER', 'SHOP'] as const satisfies readonly OrderPlacedBy[];

/** The cart as the shopper sends it: no price, no customer, no address — the API has them. */
export class PlaceCustomerOrderDto implements PlaceCustomerOrderPayload {
  @ApiProperty({ type: [OrderItemDto], minItems: 1, maxItems: ORDER_ITEMS_MAX })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ORDER_ITEMS_MAX)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ enum: ORDER_FULFILLMENTS, description: "A delivery goes to the saved address chosen, else to the shopper's default." })
  @IsIn(ORDER_FULFILLMENTS)
  fulfillment!: OrderFulfillment;

  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ format: 'uuid', description: "One of the shopper's saved addresses; ignored on a pick-up. Another's is ORDER_ADDRESS_NOT_FOUND." })
  @IsOptional()
  @IsUUID('all')
  addressId?: string;
}

export class CustomerOrderItemResponse implements CustomerOrderItem {
  @ApiProperty({ format: 'uuid', nullable: true, type: String, description: 'Null once the product was deleted.' })
  productId!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'The product\'s slug while it is on sale; null once it is off sale or gone.' }) productSlug!: string | null;
  @ApiProperty() productName!: string;
  @ApiProperty({ nullable: true, type: String, example: 'Sabor: Uva · Peso: 300 g' }) variantLabel!: string | null;
  @ApiProperty({ nullable: true, type: String, description: "The combination's photo, else the product's first; null once the product is gone." })
  imageUrl!: string | null;
  @ApiProperty({ description: 'Whole cents, as it was when the order was placed.' }) unitPriceCents!: number;
  @ApiProperty() quantity!: number;
  @ApiProperty() lineTotalCents!: number;
}

export class CustomerOrderEventResponse implements CustomerOrderEvent {
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty({ format: 'date-time' }) at!: string;
}

export class CustomerOrderResponse implements CustomerOrder {
  @ApiProperty({ description: 'Sequential within the shop.' }) number!: number;
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty({ enum: SIDES, description: 'The customer from the cart, or the shop from its panel.' }) placedBy!: OrderPlacedBy;
  @ApiProperty({ enum: SIDES, nullable: true, description: 'On a cancelled order; null on any other.' }) cancelledBy!: OrderPlacedBy | null;
  @ApiProperty({ enum: ORDER_FULFILLMENTS }) fulfillment!: OrderFulfillment;
  @ApiProperty({ type: OrderDeliveryAddressResponse, nullable: true, description: 'Null on a pick-up.' })
  deliveryAddress!: OrderDeliveryAddressResponse | null;
  @ApiProperty({ enum: PAYMENT_METHODS }) paymentMethod!: PaymentMethod;
  @ApiProperty({ type: [CustomerOrderItemResponse] }) items!: CustomerOrderItemResponse[];
  @ApiProperty() subtotalCents!: number;
  @ApiProperty() deliveryFeeCents!: number;
  @ApiProperty() discountCents!: number;
  @ApiProperty() totalCents!: number;
  @ApiProperty({ format: 'date-time' }) placedAt!: string;
  @ApiProperty({ type: [CustomerOrderEventResponse], description: 'Oldest first; never who set each status.' })
  events!: CustomerOrderEventResponse[];
  @ApiProperty({ type: OrderDeliveryResponse, nullable: true, description: 'Who brings it and when, once the shop told; null on a pick-up.' })
  delivery!: OrderDeliveryResponse | null;
}

export class CustomerOrderEstimateResponse {
  @ApiProperty({ format: 'date' }) from!: string;
  @ApiProperty({ format: 'date' }) to!: string;
}

export class CustomerOrderSummaryResponse implements CustomerOrderSummary {
  @ApiProperty() number!: number;
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty({ enum: SIDES }) placedBy!: OrderPlacedBy;
  @ApiProperty({ enum: SIDES, nullable: true }) cancelledBy!: OrderPlacedBy | null;
  @ApiProperty({ format: 'date-time', description: 'When it reached the status it is in.' }) statusAt!: string;
  @ApiProperty({ enum: ORDER_FULFILLMENTS }) fulfillment!: OrderFulfillment;
  @ApiProperty({ nullable: true, type: String }) recipientName!: string | null;
  @ApiProperty({ enum: PAYMENT_METHODS }) paymentMethod!: PaymentMethod;
  @ApiProperty() totalCents!: number;
  @ApiProperty({ description: 'Units across every line.' }) itemsCount!: number;
  @ApiProperty({ type: [CustomerOrderItemResponse], description: 'The first lines, as a card shows them.' }) items!: CustomerOrderItemResponse[];
  @ApiProperty({ description: 'Lines past those.' }) moreItems!: number;
  @ApiProperty({ format: 'date-time' }) placedAt!: string;
  @ApiProperty({ type: CustomerOrderEstimateResponse, nullable: true, description: 'The window it should arrive in, once the shop told one.' })
  estimate!: CustomerOrderEstimateResponse | null;
}

class CustomerOrderCountsResponse {
  @ApiProperty() ALL!: number;
  @ApiProperty() ACTIVE!: number;
  @ApiProperty() DELIVERED!: number;
  @ApiProperty() CANCELLED!: number;
}

export class CustomerOrderPageResponse implements CustomerOrderPage {
  @ApiProperty({ type: [CustomerOrderSummaryResponse] }) orders!: CustomerOrderSummaryResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: CustomerOrderCountsResponse, description: 'Following the period and the search, not the tab.' })
  counts!: CustomerOrderCountsResponse;
  @ApiProperty({ type: [Number], description: 'The years with orders, most recent first.' }) years!: number[];
}

/** How the customer asks for a page of their orders. Absent means all. */
export class ListCustomerOrdersDto implements CustomerOrderListQuery {
  @ApiPropertyOptional({ enum: SITUATIONS })
  @IsOptional()
  @blankToNull
  @IsIn(SITUATIONS)
  situation?: CustomerOrderSituation;

  @ApiPropertyOptional({ example: '3m', description: '`3m`, the last three months, or a year such as `2025`, in the shop\'s calendar.' })
  @IsOptional()
  @blankToNull
  @Matches(/^(3m|20\d{2})$/, { message: 'period must be 3m or a year' })
  period?: string;

  @ApiPropertyOptional({ description: 'An order number, or part of a product name.' })
  @IsOptional()
  @IsString()
  @trim
  @MaxLength(120)
  q?: string;

  // `@Type(() => Number)` and not the pipe's implicit conversion — apps/api/AGENTS.md, rule 6.
  @ApiPropertyOptional({ minimum: 1, maximum: ORDERS_PAGE_MAX, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(ORDERS_PAGE_MAX)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: CUSTOMER_ORDERS_PAGE_SIZE_MAX, default: CUSTOMER_ORDERS_PAGE_SIZE })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(CUSTOMER_ORDERS_PAGE_SIZE_MAX)
  @Type(() => Number)
  pageSize?: number;
}

const REORDER_LEFT_REASONS = ['OFF_SALE', 'SOLD_OUT', 'LIMITED'] as const satisfies readonly ReorderLeftReason[];

export class CustomerReorderLineResponse implements CustomerReorderLine {
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String, description: 'Null for a product without options, as the cart writes such a line.' })
  variantId!: string | null;
  @ApiProperty({ description: 'As many as the order had, or as the stock allows.' }) quantity!: number;
}

export class CustomerReorderLeftResponse implements CustomerReorderLeft {
  @ApiProperty() productName!: string;
  @ApiProperty({ nullable: true, type: String, example: 'Sabor: Uva · Peso: 300 g' }) variantLabel!: string | null;
  @ApiProperty({ enum: REORDER_LEFT_REASONS, description: 'OFF_SALE — the shop no longer sells it · SOLD_OUT — none left · LIMITED — fewer left than the order had' })
  reason!: ReorderLeftReason;
  @ApiProperty({ description: 'Units that went in: zero unless LIMITED.' }) added!: number;
}

export class CustomerReorderResponse implements CustomerReorder {
  @ApiProperty() number!: number;
  @ApiProperty({ type: [CustomerReorderLineResponse] }) lines!: CustomerReorderLineResponse[];
  @ApiProperty({ type: [CustomerReorderLeftResponse] }) left!: CustomerReorderLeftResponse[];
}
