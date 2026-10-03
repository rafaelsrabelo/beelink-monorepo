// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsISO8601, IsObject, IsOptional, IsUUID, Max, Min, ValidateNested } from 'class-validator';

// Types
import type {
  QuotedCashback,
  CartQuotePayload,
  CouponKind,
  CouponRefusalReason,
  CustomerCartQuotePayload,
  CustomerOrderQuotePayload,
  OrderFulfillment,
  OrderQuote,
  OrderQuoteLine,
  OrderShippingChoice,
  QuotedCoupon,
  QuotedFirstPurchase,
  ShopOrderQuotePayload,
} from '@harness-monorepo/contracts';

// App
import { QuotedCashbackResponse, QuotedCashbackUseResponse } from '../../cashback/dto/cashback.response.js';
import { ShippingQuoteResponse } from '../../delivery/dto/delivery.response.js';
import { COUPON_KINDS } from '../../promotions/promotions.constants.js';
import { ORDER_AMOUNT_MAX_CENTS, ORDER_FULFILLMENTS, ORDER_ITEMS_MAX } from '../orders.constants.js';
import { couponCode, OrderCustomerDto, OrderItemDto, shippingChoice } from './order.dto.js';

const COUPON_VERDICTS = ['APPLIED', 'REFUSED'] as const satisfies readonly QuotedCoupon['status'][];
const COUPON_REFUSALS = ['NOT_FOUND', 'EXPIRED', 'EXHAUSTED', 'INACTIVE', 'CUSTOMER_LIMIT', 'NOT_FIRST_PURCHASE', 'NOT_APPLICABLE', 'BELOW_MINIMUM'] as const satisfies readonly CouponRefusalReason[];
const FIRST_PURCHASE_STATUSES = ['UNIDENTIFIED', 'NOT_FIRST'] as const satisfies readonly QuotedFirstPurchase['status'][];

/** The visitor's cart: the lines and how it would leave. No coupon — that takes a signed-in customer. */
export class CartQuoteDto implements CartQuotePayload {
  @ApiProperty({ type: [OrderItemDto], minItems: 1, maxItems: ORDER_ITEMS_MAX })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ORDER_ITEMS_MAX)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiPropertyOptional({ enum: ORDER_FULFILLMENTS, description: 'Absent is a delivery.' })
  @IsOptional()
  @IsIn(ORDER_FULFILLMENTS)
  fulfillment?: OrderFulfillment;
}

/** The signed-in customer's cart with no code: a coupon in it is refused, so this door answers nothing about a shop's codes. */
export class CustomerCartQuoteDto implements CustomerCartQuotePayload {
  @ApiProperty({ type: [OrderItemDto], minItems: 1, maxItems: ORDER_ITEMS_MAX })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ORDER_ITEMS_MAX)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ enum: ORDER_FULFILLMENTS })
  @IsIn(ORDER_FULFILLMENTS)
  fulfillment!: OrderFulfillment;

  @ApiPropertyOptional({ format: 'uuid', description: "The saved address a delivery would go to; absent, the customer's default. The shop's ways to get there are quoted either way." })
  @IsOptional()
  @IsUUID('all')
  addressId?: string;

  @shippingChoice
  shipping?: OrderShippingChoice;

  @ApiPropertyOptional({ description: 'Apply the most of the customer\'s credit the cart can take (BEELINK-240). Absent is not to.' })
  @IsOptional()
  @IsBoolean()
  useCashback?: boolean;
}

/** The signed-in customer's cart, with the coupon they typed. */
export class CustomerOrderQuoteDto implements CustomerOrderQuotePayload {
  @ApiProperty({ type: [OrderItemDto], minItems: 1, maxItems: ORDER_ITEMS_MAX })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ORDER_ITEMS_MAX)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ enum: ORDER_FULFILLMENTS })
  @IsIn(ORDER_FULFILLMENTS)
  fulfillment!: OrderFulfillment;

  @ApiPropertyOptional({ format: 'uuid', description: "The saved address a delivery would go to; absent, the customer's default. The shop's ways to get there are quoted either way." })
  @IsOptional()
  @IsUUID('all')
  addressId?: string;

  @shippingChoice
  shipping?: OrderShippingChoice;

  @couponCode
  couponCode?: string | null;

  @ApiPropertyOptional({ description: 'Apply the most of the customer\'s credit the cart can take (BEELINK-240). Absent is not to.' })
  @IsOptional()
  @IsBoolean()
  useCashback?: boolean;
}

/** The panel's sale before it is registered: what of `CreateOrderDto` prices it. */
export class ShopOrderQuoteDto implements Omit<ShopOrderQuotePayload, 'customer'> {
  @ApiPropertyOptional({
    type: OrderCustomerDto,
    description: "Whose order it is, for a coupon's limit by customer and for a first purchase. A phone the shop does not have is a customer the order would register; absent, nobody is identified yet.",
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OrderCustomerDto)
  customer?: OrderCustomerDto;

  @ApiProperty({ type: [OrderItemDto], minItems: 1, maxItems: ORDER_ITEMS_MAX })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ORDER_ITEMS_MAX)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ enum: ORDER_FULFILLMENTS })
  @IsIn(ORDER_FULFILLMENTS)
  fulfillment!: OrderFulfillment;

  @ApiPropertyOptional({ minimum: 0, maximum: ORDER_AMOUNT_MAX_CENTS, description: 'Whole cents; zero on a pick-up.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(ORDER_AMOUNT_MAX_CENTS)
  deliveryFeeCents?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: ORDER_AMOUNT_MAX_CENTS, description: 'Whole cents the shopkeeper takes off by hand.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(ORDER_AMOUNT_MAX_CENTS)
  discountCents?: number;

  @couponCode
  couponCode?: string | null;

  @ApiPropertyOptional({ description: 'Apply the most of the customer\'s credit the cart can take (BEELINK-240). Absent is not to.' })
  @IsOptional()
  @IsBoolean()
  useCashback?: boolean;

  @ApiPropertyOptional({ format: 'date-time', description: 'When it was sold; absent is now. Promotions and the coupon are read at it.' })
  @IsOptional()
  @IsISO8601({ strict: true })
  placedAt?: string;
}

class QuotePromotionResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

export class OrderQuoteLineResponse implements OrderQuoteLine {
  @ApiProperty({ format: 'uuid' }) variantId!: string;
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty({ description: "The catalogue's price of one unit, before any promotion." }) unitPriceCents!: number;
  @ApiProperty() lineTotalCents!: number;
  @ApiProperty({ description: 'What the promotion takes off this line; zero with none.' }) discountCents!: number;
  @ApiProperty({ type: QuotePromotionResponse, nullable: true }) promotion!: QuotePromotionResponse | null;
}

/** The two verdicts as one Swagger shape; the wire type is their union. */
export class QuotedCouponResponse {
  @ApiProperty({ enum: COUPON_VERDICTS }) status!: QuotedCoupon['status'];
  @ApiProperty({ example: 'BEMVINDO10' }) code!: string;
  @ApiPropertyOptional({ enum: COUPON_KINDS, description: 'On APPLIED.' }) kind?: CouponKind;
  @ApiPropertyOptional({ enum: COUPON_REFUSALS, description: 'On REFUSED.' }) reason?: CouponRefusalReason;
  @ApiPropertyOptional({ description: 'On BELOW_MINIMUM: what the products have to add up to, after promotions.' }) minSubtotalCents?: number;
}

export class QuotedFirstPurchaseResponse implements QuotedFirstPurchase {
  @ApiProperty({ enum: FIRST_PURCHASE_STATUSES, description: 'UNIDENTIFIED — nobody is identified yet · NOT_FIRST — this customer already has an order at the shop that stands' })
  status!: QuotedFirstPurchase['status'];
  @ApiProperty({ nullable: true, type: String, description: "The promotion's name when one alone would apply; null when several would." }) promotionName!: string | null;
  @ApiProperty({ description: 'What it would take off this cart beyond what the cart already gets; always more than zero.' }) discountCents!: number;
}

export class OrderQuoteResponse implements Omit<OrderQuote, 'coupon'> {
  @ApiProperty({ type: [OrderQuoteLineResponse] }) lines!: OrderQuoteLineResponse[];
  @ApiProperty() subtotalCents!: number;
  @ApiProperty({ description: "The sum of the lines' discounts." }) promotionDiscountCents!: number;
  @ApiProperty({ type: QuotedFirstPurchaseResponse, nullable: true, description: 'A first-purchase promotion this cart would get and did not; null with none, and once it applied.' })
  firstPurchase!: QuotedFirstPurchaseResponse | null;
  @ApiProperty({ type: QuotedCouponResponse, nullable: true, description: 'Null when no code was sent.' }) coupon!: QuotedCouponResponse | null;
  @ApiProperty() couponDiscountCents!: number;
  @ApiProperty({ description: 'What the shopkeeper typed; zero from the cart.' }) manualDiscountCents!: number;
  @ApiProperty({ description: 'Promotions, coupon and typed discount together.' }) discountCents!: number;
  @ApiProperty({ type: Number, nullable: true, description: "Zero on a pick-up; on a delivery, the fee of the shop's own delivery to the address asked about — null while there is none to say." }) deliveryFeeCents!: number | null;
  @ApiProperty({ type: ShippingQuoteResponse, nullable: true, description: "The shop's ways to get this cart to the address asked about; null with no address to quote to." }) shipping!: ShippingQuoteResponse | null;
  @ApiProperty() totalCents!: number;
  @ApiProperty({ type: QuotedCashbackResponse, nullable: true, description: 'What it would earn once delivered; null while the cashback is off.' }) cashback!: QuotedCashback | null;
  @ApiProperty({ type: QuotedCashbackUseResponse, nullable: true, description: "The customer's credit against the cart; the total is already less what was applied. Null on a visitor's cart." }) cashbackUse!: QuotedCashbackUseResponse | null;
}
