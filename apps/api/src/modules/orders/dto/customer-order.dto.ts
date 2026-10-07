// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';

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
  OrderMarketingConsentInput,
  OrderOriginInput,
  OrderPaymentChannel,
  OrderCancelledBy,
  OrderPlacedBy,
  OrderShippingChoice,
  OrderStatus,
  PaymentMethod,
  PlaceCustomerOrderPayload,
} from '@harness-monorepo/contracts';

// App
import { OrderCashbackResponse } from '../../cashback/dto/cashback.response.js';
import { ShippingWindowResponse } from '../../delivery/dto/delivery.response.js';
import { cpfDigitsOf, IsCpf } from '../../../shared/http/cpf.js';
import { clickIdOf, FBCLID_MAX, FBP_MAX, fbpOf, ORIGIN_LABEL_MAX, originLabelOf, PAGE_URL_MAX, pageUrlOf, pastInstantOf, USER_AGENT_MAX, userAgentOf } from '../order-origin.js';
import { ORDER_PAYMENT_CHANNELS, OrderPaymentBriefResponse, OrderPaymentResponse } from '../../payments/dto/payment.response.js';
import { blankToNull, trim } from '../../stores/dto/store-fields.dto.js';
import { PAYMENT_METHODS } from '../../stores/stores.constants.js';
import {
  CUSTOMER_ORDER_SITUATIONS,
  CUSTOMER_ORDERS_PAGE_SIZE,
  CUSTOMER_ORDERS_PAGE_SIZE_MAX,
  ORDER_AMOUNT_MAX_CENTS,
  ORDER_FULFILLMENTS,
  ORDER_INSTALLMENTS_MAX,
  ORDER_ITEMS_MAX,
  ORDER_STATUSES,
  ORDERS_PAGE_MAX,
} from '../orders.constants.js';
import { cashbackCents, couponCode, OrderItemDto, shippingChoice } from './order.dto.js';
import { OrderCouponResponse, OrderDeliveryAddressResponse, OrderDeliveryResponse } from './order.response.js';

const SITUATIONS = Object.keys(CUSTOMER_ORDER_SITUATIONS) as CustomerOrderSituation[];
const SIDES = ['CUSTOMER', 'SHOP'] as const satisfies readonly OrderPlacedBy[];
const CANCELLERS = [...SIDES, 'SYSTEM'] as const satisfies readonly OrderCancelledBy[];

type Sent = { value: unknown };

/**
 * The campaign the buyer arrived by (BEELINK-275). Every label is cleaned and cut as it comes in,
 * and one that is nothing after that is dropped: no value here refuses the order.
 */
export class OrderOriginDto implements OrderOriginInput {
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: ORIGIN_LABEL_MAX, example: 'facebook', description: '`utm_source`; kept in lower case.' })
  @Transform(({ value }: Sent) => originLabelOf(value, true))
  @IsOptional()
  @IsString()
  @MaxLength(ORIGIN_LABEL_MAX)
  source?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: ORIGIN_LABEL_MAX, example: 'cpc', description: '`utm_medium`; kept in lower case.' })
  @Transform(({ value }: Sent) => originLabelOf(value, true))
  @IsOptional()
  @IsString()
  @MaxLength(ORIGIN_LABEL_MAX)
  medium?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: ORIGIN_LABEL_MAX, description: '`utm_campaign`, as written.' })
  @Transform(({ value }: Sent) => originLabelOf(value))
  @IsOptional()
  @IsString()
  @MaxLength(ORIGIN_LABEL_MAX)
  campaign?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: ORIGIN_LABEL_MAX })
  @Transform(({ value }: Sent) => originLabelOf(value))
  @IsOptional()
  @IsString()
  @MaxLength(ORIGIN_LABEL_MAX)
  content?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: ORIGIN_LABEL_MAX })
  @Transform(({ value }: Sent) => originLabelOf(value))
  @IsOptional()
  @IsString()
  @MaxLength(ORIGIN_LABEL_MAX)
  term?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time', description: 'When the visitor arrived by it. One in the future, or older than ninety days, is dropped.' })
  @Transform(({ value }: Sent) => pastInstantOf(value))
  @IsOptional()
  @IsString()
  arrivedAt?: string | null;
}

/**
 * What stood in the buyer's browser with their yes to the shop's pixel (BEELINK-275). Sent only
 * while that yes stood: the object being there is the fact. What is not in its shape is dropped.
 */
export class OrderMarketingConsentDto implements OrderMarketingConsentInput {
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: FBCLID_MAX, description: "Meta's click identifier as this shop received it; kept only with `clickedAt`." })
  @Transform(({ value }: Sent) => clickIdOf(value))
  @IsOptional()
  @IsString()
  @MaxLength(FBCLID_MAX)
  fbclid?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time', description: 'When that click arrived.' })
  @Transform(({ value }: Sent) => pastInstantOf(value))
  @IsOptional()
  @IsString()
  clickedAt?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: FBP_MAX, example: 'fb.1.1759795200000.1234567890', description: "Meta's `_fbp` cookie." })
  @Transform(({ value }: Sent) => fbpOf(value))
  @IsOptional()
  @IsString()
  @MaxLength(FBP_MAX)
  fbp?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: USER_AGENT_MAX })
  @Transform(({ value }: Sent) => userAgentOf(value))
  @IsOptional()
  @IsString()
  @MaxLength(USER_AGENT_MAX)
  userAgent?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: PAGE_URL_MAX, description: 'The page the order was placed from; its query is dropped.' })
  @Transform(({ value }: Sent) => pageUrlOf(value))
  @IsOptional()
  @IsString()
  @MaxLength(PAGE_URL_MAX)
  pageUrl?: string | null;
}

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

  @ApiPropertyOptional({ enum: ORDER_PAYMENT_CHANNELS, default: 'OFFLINE', description: "ONLINE is charged at the shop's Asaas account, by PIX or CREDIT_CARD only; what the shop does not take now is ORDER_PAYMENT_NOT_ACCEPTED." })
  @IsOptional()
  @IsIn(ORDER_PAYMENT_CHANNELS)
  paymentChannel?: OrderPaymentChannel;

  @ApiPropertyOptional({ minimum: 1, maximum: ORDER_INSTALLMENTS_MAX, default: 1, description: "How many instalments an online card is paid in, up to the shop's most; each of at least Asaas's least (ORDER_PAYMENT_BELOW_MINIMUM)." })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(ORDER_INSTALLMENTS_MAX)
  installments?: number;

  @ApiPropertyOptional({ format: 'uuid', description: "One of the shopper's saved addresses; ignored on a pick-up. Another's is ORDER_ADDRESS_NOT_FOUND." })
  @IsOptional()
  @IsUUID('all')
  addressId?: string;

  @couponCode
  couponCode?: string | null;

  @cashbackCents
  cashbackCents?: number;

  @shippingChoice
  shipping?: OrderShippingChoice;

  @ApiPropertyOptional({ type: String, example: '529.982.247-25', description: "The customer's CPF, when their record has none: a carrier's label is bought with it and an online payment is charged to it. Kept on the record." })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => cpfDigitsOf(value))
  @IsCpf({ context: { errorCode: 'CUSTOMER_CPF_INVALID' } })
  recipientDocument?: string;

  @ApiPropertyOptional({ nullable: true, type: Number, minimum: 0, description: 'The delivery fee the quote showed, null for one agreed afterwards: a different fee now is ORDER_SHIPPING_CHANGED. Absent is not checked.' })
  // Null is a fee the quote said is agreed afterwards, and so is sent; only a number is held to its range.
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  @Min(0)
  @Max(ORDER_AMOUNT_MAX_CENTS)
  deliveryFeeCents?: number | null;

  @ApiPropertyOptional({ type: OrderOriginDto, description: "The campaign the buyer arrived by at this shop, read by the web's order handler from the shop's own cookie." })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderOriginDto)
  origin?: OrderOriginDto;

  @ApiPropertyOptional({ type: OrderMarketingConsentDto, description: "Present only while the buyer's yes to this shop's pixel stood: absent is no consent, and nothing of it is kept." })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderMarketingConsentDto)
  marketingConsent?: OrderMarketingConsentDto;
}

export class CustomerOrderItemResponse implements CustomerOrderItem {
  @ApiProperty({ format: 'uuid', nullable: true, type: String, description: 'Null once the product was deleted.' })
  productId!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'The product\'s slug while it is on sale; null once it is off sale or gone.' }) productSlug!: string | null;
  @ApiProperty() productName!: string;
  @ApiProperty({ nullable: true, type: String, example: 'Sabor: Uva · Peso: 300 g' }) variantLabel!: string | null;
  @ApiProperty({ nullable: true, type: String, description: "The combination's photo, else the product's first; null once the product is gone." })
  imageUrl!: string | null;
  @ApiProperty({ description: "Whole cents: the catalogue's price when the order was placed, before any promotion." }) unitPriceCents!: number;
  @ApiProperty() quantity!: number;
  @ApiProperty() lineTotalCents!: number;
  @ApiProperty({ description: 'What a promotion took off this line; zero with none.' }) discountCents!: number;
  @ApiProperty({ nullable: true, type: String, description: "The promotion's name as it was." }) promotionName!: string | null;
}

export class CustomerOrderEventResponse implements CustomerOrderEvent {
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty({ format: 'date-time' }) at!: string;
}

export class CustomerOrderResponse implements CustomerOrder {
  @ApiProperty({ format: 'uuid', description: "The order's own id: what names its purchase to an advertising tool. No route takes it." }) id!: string;
  @ApiProperty({ description: 'Sequential within the shop.' }) number!: number;
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty({ enum: SIDES, description: 'The customer from the cart, or the shop from its panel.' }) placedBy!: OrderPlacedBy;
  @ApiProperty({ enum: CANCELLERS, nullable: true, description: 'On a cancelled order; null on any other. SYSTEM is bee-link itself, for want of payment.' }) cancelledBy!: OrderCancelledBy | null;
  @ApiProperty({ enum: ORDER_FULFILLMENTS }) fulfillment!: OrderFulfillment;
  @ApiProperty({ type: OrderDeliveryAddressResponse, nullable: true, description: 'Null on a pick-up.' })
  deliveryAddress!: OrderDeliveryAddressResponse | null;
  @ApiProperty({ enum: PAYMENT_METHODS }) paymentMethod!: PaymentMethod;
  @ApiProperty({ enum: ORDER_PAYMENT_CHANNELS, description: 'OFFLINE is settled between the shop and the customer; ONLINE is charged at Asaas.' }) paymentChannel!: OrderPaymentChannel;
  @ApiProperty({ minimum: 1, maximum: 12, description: 'The instalments they chose; 1 unless it is an online card.' }) installments!: number;
  @ApiProperty({ type: OrderPaymentResponse, nullable: true, description: 'Its charge: the one standing, else the last tried. Null offline, and online while it has none.' })
  payment!: OrderPaymentResponse | null;
  @ApiProperty({ type: [CustomerOrderItemResponse] }) items!: CustomerOrderItemResponse[];
  @ApiProperty() subtotalCents!: number;
  @ApiProperty({ type: Number, nullable: true, description: 'Null while a delivery\'s fee is not agreed ("a combinar"); zero is a free delivery.' }) deliveryFeeCents!: number | null;
  @ApiProperty({ description: 'Everything taken off: the promotions, the coupon and what the shop took off by hand.' }) discountCents!: number;
  @ApiProperty({ description: "The sum of the lines' promotion discounts." }) promotionDiscountCents!: number;
  @ApiProperty({ description: 'What the coupon took off; on a free delivery, the fee.' }) couponDiscountCents!: number;
  @ApiProperty({ type: OrderCouponResponse, nullable: true, description: 'The coupon the order took, as it was.' }) coupon!: OrderCouponResponse | null;
  @ApiProperty({ type: OrderCashbackResponse, nullable: true, description: 'What it earns in cashback; null when it earns none.' }) cashback!: OrderCashbackResponse | null;
  @ApiProperty({ description: 'Their credit it spent, taken off the total apart from the discount.' }) cashbackUsedCents!: number;
  @ApiProperty() totalCents!: number;
  @ApiProperty({ format: 'date-time' }) placedAt!: string;
  @ApiProperty({ type: [CustomerOrderEventResponse], description: 'Oldest first; never who set each status.' })
  events!: CustomerOrderEventResponse[];
  @ApiProperty({ type: OrderDeliveryResponse, nullable: true, description: 'Who brings it and when, once the shop told; null on a pick-up.' })
  delivery!: OrderDeliveryResponse | null;
  @ApiProperty({ type: ShippingWindowResponse, nullable: true, description: 'The window the quote gave when the order was placed; null on a pick-up and on a fee agreed afterwards.' })
  deliveryWindow!: ShippingWindowResponse | null;
}

export class CustomerOrderEstimateResponse {
  @ApiProperty({ format: 'date' }) from!: string;
  @ApiProperty({ format: 'date' }) to!: string;
}

export class CustomerOrderSummaryResponse implements CustomerOrderSummary {
  @ApiProperty() number!: number;
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty({ enum: SIDES }) placedBy!: OrderPlacedBy;
  @ApiProperty({ enum: CANCELLERS, nullable: true }) cancelledBy!: OrderCancelledBy | null;
  @ApiProperty({ format: 'date-time', description: 'When it reached the status it is in.' }) statusAt!: string;
  @ApiProperty({ enum: ORDER_FULFILLMENTS }) fulfillment!: OrderFulfillment;
  @ApiProperty({ nullable: true, type: String }) recipientName!: string | null;
  @ApiProperty({ enum: PAYMENT_METHODS }) paymentMethod!: PaymentMethod;
  @ApiProperty({ enum: ORDER_PAYMENT_CHANNELS, description: 'OFFLINE is settled between the shop and the customer; ONLINE is charged at Asaas.' }) paymentChannel!: OrderPaymentChannel;
  @ApiProperty({ type: OrderPaymentBriefResponse, nullable: true }) payment!: OrderPaymentBriefResponse | null;
  @ApiProperty() totalCents!: number;
  @ApiProperty({ type: Number, nullable: true, description: 'Null while a delivery\'s fee is not agreed ("a combinar"); zero is a free delivery.' }) deliveryFeeCents!: number | null;
  @ApiProperty({ description: 'Promotions, coupon and typed discount together.' }) discountCents!: number;
  @ApiProperty({ type: OrderCouponResponse, nullable: true, description: 'The coupon the order took, as it was.' }) coupon!: OrderCouponResponse | null;
  @ApiProperty({ type: OrderCashbackResponse, nullable: true, description: 'What it earns in cashback; null when it earns none.' }) cashback!: OrderCashbackResponse | null;
  @ApiProperty({ description: 'Their credit it spent, taken off the total apart from the discount.' }) cashbackUsedCents!: number;
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
