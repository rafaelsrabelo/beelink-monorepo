// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  Order,
  OrderActor,
  OrderCustomer,
  OrderEvent,
  OrderFulfillment,
  OrderItem,
  OrderPage,
  OrderStatus,
  OrderSummary,
  PaymentMethod,
} from '@harness-monorepo/contracts';

// App
import { PAYMENT_METHODS } from '../../stores/stores.constants.js';
import { ORDER_FULFILLMENTS, ORDER_STATUSES } from '../orders.constants.js';

const ORDER_ACTORS = ['SHOPKEEPER', 'CUSTOMER', 'SYSTEM'] as const satisfies readonly OrderActor[];

/**
 * The shapes out, for Swagger. Each `implements` its contract type, so a field added to the wire
 * and forgotten here fails to compile rather than going missing from /api/docs.
 */
export class OrderCustomerResponse implements OrderCustomer {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String, description: 'Digits only.' }) phone!: string | null;
}

export class OrderItemResponse implements OrderItem {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String, description: 'Null once the product was deleted.' })
  productId!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) variantId!: string | null;
  @ApiProperty({ description: 'As it was when the order was placed.' }) productName!: string;
  @ApiProperty({ nullable: true, type: String, example: 'Sabor: Uva · Peso: 300 g' }) variantLabel!: string | null;
  @ApiProperty({ nullable: true, type: String }) sku!: string | null;
  @ApiProperty({ description: 'Whole cents, as it was when the order was placed.' }) unitPriceCents!: number;
  @ApiProperty() quantity!: number;
  @ApiProperty() lineTotalCents!: number;
}

export class OrderEventResponse implements OrderEvent {
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty({ enum: ORDER_ACTORS }) actor!: OrderActor;
  @ApiProperty({ format: 'date-time' }) at!: string;
}

export class OrderResponse implements Order {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ description: 'Sequential within the shop.' }) number!: number;
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty({ type: OrderCustomerResponse }) customer!: OrderCustomerResponse;
  @ApiProperty({ enum: ORDER_FULFILLMENTS }) fulfillment!: OrderFulfillment;
  @ApiProperty({ enum: PAYMENT_METHODS }) paymentMethod!: PaymentMethod;
  @ApiProperty({ type: [OrderItemResponse] }) items!: OrderItemResponse[];
  @ApiProperty() subtotalCents!: number;
  @ApiProperty() deliveryFeeCents!: number;
  @ApiProperty() discountCents!: number;
  @ApiProperty() totalCents!: number;
  @ApiProperty({ nullable: true, type: String }) note!: string | null;
  @ApiProperty({ format: 'date-time' }) placedAt!: string;
  @ApiProperty({ type: [OrderEventResponse], description: 'Oldest first.' }) events!: OrderEventResponse[];
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class OrderSummaryResponse implements OrderSummary {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() number!: number;
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty({ type: OrderCustomerResponse }) customer!: OrderCustomerResponse;
  @ApiProperty({ enum: ORDER_FULFILLMENTS }) fulfillment!: OrderFulfillment;
  @ApiProperty({ enum: PAYMENT_METHODS }) paymentMethod!: PaymentMethod;
  @ApiProperty() totalCents!: number;
  @ApiProperty({ description: 'Units across every line.' }) itemsCount!: number;
  @ApiProperty({ format: 'date-time' }) placedAt!: string;
}

export class OrderPageResponse implements OrderPage {
  @ApiProperty({ type: [OrderSummaryResponse] }) orders!: OrderSummaryResponse[];
  @ApiProperty({ description: 'How many match, across every page.' }) total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
