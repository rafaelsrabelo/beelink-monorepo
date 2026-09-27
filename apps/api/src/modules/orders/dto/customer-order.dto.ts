// Nest
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, ValidateNested } from 'class-validator';

// Types
import type {
  CustomerOrder,
  CustomerOrderItem,
  OrderFulfillment,
  OrderStatus,
  PaymentMethod,
  PlaceCustomerOrderPayload,
} from '@harness-monorepo/contracts';

// App
import { PAYMENT_METHODS } from '../../stores/stores.constants.js';
import { ORDER_FULFILLMENTS, ORDER_ITEMS_MAX, ORDER_STATUSES } from '../orders.constants.js';
import { OrderItemDto } from './order.dto.js';
import { OrderDeliveryAddressResponse } from './order.response.js';

/** The cart as the shopper sends it: no price, no customer, no address — the API has them. */
export class PlaceCustomerOrderDto implements PlaceCustomerOrderPayload {
  @ApiProperty({ type: [OrderItemDto], minItems: 1, maxItems: ORDER_ITEMS_MAX })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ORDER_ITEMS_MAX)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ enum: ORDER_FULFILLMENTS, description: "A delivery goes to the shopper's address on file." })
  @IsIn(ORDER_FULFILLMENTS)
  fulfillment!: OrderFulfillment;

  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  paymentMethod!: PaymentMethod;
}

export class CustomerOrderItemResponse implements CustomerOrderItem {
  @ApiProperty({ format: 'uuid', nullable: true, type: String, description: 'Null once the product was deleted.' })
  productId!: string | null;
  @ApiProperty() productName!: string;
  @ApiProperty({ nullable: true, type: String, example: 'Sabor: Uva · Peso: 300 g' }) variantLabel!: string | null;
  @ApiProperty({ description: 'Whole cents, as it was when the order was placed.' }) unitPriceCents!: number;
  @ApiProperty() quantity!: number;
  @ApiProperty() lineTotalCents!: number;
}

export class CustomerOrderResponse implements CustomerOrder {
  @ApiProperty({ description: 'Sequential within the shop.' }) number!: number;
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
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
}
