// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  OrderDelivery,
  OrderDeliveryKind,
  Order,
  OrderActor,
  OrderCoupon,
  CouponKind,
  OrderCustomer,
  OrderDeliveryAddress,
  OrderEvent,
  OrderFulfillment,
  OrderItem,
  OrderPage,
  OrderStatus,
  OrderSummary,
  PaymentMethod,
} from '@harness-monorepo/contracts';

// App
import { ShopOrderCashbackResponse } from '../../cashback/dto/cashback.response.js';
import { COUPON_KINDS } from '../../promotions/promotions.constants.js';
import { PAYMENT_METHODS } from '../../stores/stores.constants.js';
import { ORDER_DELIVERY_KINDS, ORDER_FULFILLMENTS, ORDER_STATUSES } from '../orders.constants.js';

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

export class OrderDeliveryAddressResponse implements OrderDeliveryAddress {
  @ApiProperty({ description: "Who receives it: the customer's name when the order was placed." }) recipientName!: string;
  @ApiProperty({ nullable: true, type: String }) zipCode!: string | null;
  @ApiProperty() street!: string;
  @ApiProperty({ nullable: true, type: String }) number!: string | null;
  @ApiProperty({ nullable: true, type: String }) complement!: string | null;
  @ApiProperty({ nullable: true, type: String }) neighborhood!: string | null;
  @ApiProperty() city!: string;
  @ApiProperty({ nullable: true, type: String, description: 'Two letters, upper case.' }) state!: string | null;
}

export class OrderItemResponse implements OrderItem {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String, description: 'Null once the product was deleted.' })
  productId!: string | null;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) variantId!: string | null;
  @ApiProperty({ description: 'As it was when the order was placed.' }) productName!: string;
  @ApiProperty({ nullable: true, type: String, example: 'Sabor: Uva · Peso: 300 g' }) variantLabel!: string | null;
  @ApiProperty({ nullable: true, type: String }) sku!: string | null;
  @ApiProperty({ description: "Whole cents: the catalogue's price when the order was placed, before any promotion." }) unitPriceCents!: number;
  @ApiProperty() quantity!: number;
  @ApiProperty() lineTotalCents!: number;
  @ApiProperty({ description: 'What a promotion took off this line; zero with none.' }) discountCents!: number;
  @ApiProperty({ nullable: true, type: String, description: "The promotion's name as it was." }) promotionName!: string | null;
}

export class OrderCouponResponse implements OrderCoupon {
  @ApiProperty({ example: 'BEMVINDO10' }) code!: string;
  @ApiProperty({ enum: COUPON_KINDS }) kind!: CouponKind;
}

export class OrderEventResponse implements OrderEvent {
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty({ enum: ORDER_ACTORS }) actor!: OrderActor;
  @ApiProperty({ format: 'date-time' }) at!: string;
}

export class OrderDeliveryResponse implements OrderDelivery {
  @ApiProperty({ enum: ORDER_DELIVERY_KINDS }) kind!: OrderDeliveryKind;
  @ApiProperty({ nullable: true, type: String, example: 'Correios' }) carrier!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'SEDEX' }) service!: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'AB123456789BR' }) trackingCode!: string | null;
  @ApiProperty({ nullable: true, type: String, description: "The shopkeeper's link, else the Correios' page for a code of theirs." })
  trackingUrl!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date' }) estimateFrom!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date' }) estimateTo!: string | null;
}

export class OrderResponse implements Order {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ description: 'Sequential within the shop.' }) number!: number;
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty({ type: OrderCustomerResponse }) customer!: OrderCustomerResponse;
  @ApiProperty({ enum: ORDER_FULFILLMENTS }) fulfillment!: OrderFulfillment;
  @ApiProperty({
    type: OrderDeliveryAddressResponse,
    nullable: true,
    description: 'As it was when the order was placed. Null on a pick-up, and on a delivery placed before orders kept it.',
  })
  deliveryAddress!: OrderDeliveryAddressResponse | null;
  @ApiProperty({ enum: PAYMENT_METHODS }) paymentMethod!: PaymentMethod;
  @ApiProperty({ type: [OrderItemResponse] }) items!: OrderItemResponse[];
  @ApiProperty() subtotalCents!: number;
  @ApiProperty({ type: Number, nullable: true, description: 'Null while a delivery\'s fee is not agreed ("a combinar"); zero is a free delivery.' }) deliveryFeeCents!: number | null;
  @ApiProperty({ description: 'Everything taken off: the promotions, the coupon and what the shopkeeper typed.' }) discountCents!: number;
  @ApiProperty({ description: "The sum of the lines' promotion discounts." }) promotionDiscountCents!: number;
  @ApiProperty({ description: 'What the coupon took off; on a free delivery, the fee.' }) couponDiscountCents!: number;
  @ApiProperty({ type: OrderCouponResponse, nullable: true, description: 'The coupon the order took, as it was.' }) coupon!: OrderCouponResponse | null;
  @ApiProperty({ type: ShopOrderCashbackResponse, nullable: true, description: 'What it earns in cashback, and where that credit stands; null when it earns none.' }) cashback!: ShopOrderCashbackResponse | null;
  @ApiProperty({ description: "The customer's credit it spent, taken off the total apart from the discount." }) cashbackUsedCents!: number;
  @ApiProperty() totalCents!: number;
  @ApiProperty({ nullable: true, type: String }) note!: string | null;
  @ApiProperty({ format: 'date-time' }) placedAt!: string;
  @ApiProperty({ type: [OrderEventResponse], description: 'Oldest first.' }) events!: OrderEventResponse[];
  @ApiProperty({ type: OrderDeliveryResponse, nullable: true, description: 'Null on a pick-up, and on a delivery nobody told yet.' })
  delivery!: OrderDeliveryResponse | null;
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
  @ApiProperty({ type: Number, nullable: true, description: 'Null while a delivery\'s fee is not agreed ("a combinar"); zero is a free delivery.' }) deliveryFeeCents!: number | null;
  @ApiProperty({ description: 'Units across every line.' }) itemsCount!: number;
  @ApiProperty({ format: 'date-time' }) placedAt!: string;
}

export class OrderPageResponse implements OrderPage {
  @ApiProperty({ type: [OrderSummaryResponse] }) orders!: OrderSummaryResponse[];
  @ApiProperty({ description: 'How many match, across every page.' }) total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
