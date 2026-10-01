// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsISO8601, IsObject, IsOptional, Max, Min, ValidateNested } from 'class-validator';

// Types
import type {
  CartQuotePayload,
  CouponKind,
  CouponRefusalReason,
  CustomerOrderQuotePayload,
  OrderFulfillment,
  OrderQuote,
  OrderQuoteLine,
  QuotedCoupon,
  ShopOrderQuotePayload,
} from '@harness-monorepo/contracts';

// App
import { COUPON_KINDS } from '../../promotions/promotions.constants.js';
import { ORDER_AMOUNT_MAX_CENTS, ORDER_FULFILLMENTS, ORDER_ITEMS_MAX } from '../orders.constants.js';
import { couponCode, OrderCustomerDto, OrderItemDto } from './order.dto.js';

const COUPON_VERDICTS = ['APPLIED', 'REFUSED'] as const satisfies readonly QuotedCoupon['status'][];
const COUPON_REFUSALS = ['NOT_FOUND', 'EXPIRED', 'EXHAUSTED', 'INACTIVE', 'CUSTOMER_LIMIT', 'NOT_APPLICABLE', 'BELOW_MINIMUM'] as const satisfies readonly CouponRefusalReason[];

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

  @couponCode
  couponCode?: string | null;
}

/** The panel's sale before it is registered: what of `CreateOrderDto` prices it. */
export class ShopOrderQuoteDto implements Omit<ShopOrderQuotePayload, 'customer'> {
  @ApiPropertyOptional({ type: OrderCustomerDto, description: "Whose order it is, for a coupon's limit by customer." })
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

export class OrderQuoteResponse implements Omit<OrderQuote, 'coupon'> {
  @ApiProperty({ type: [OrderQuoteLineResponse] }) lines!: OrderQuoteLineResponse[];
  @ApiProperty() subtotalCents!: number;
  @ApiProperty({ description: "The sum of the lines' discounts." }) promotionDiscountCents!: number;
  @ApiProperty({ type: QuotedCouponResponse, nullable: true, description: 'Null when no code was sent.' }) coupon!: QuotedCouponResponse | null;
  @ApiProperty() couponDiscountCents!: number;
  @ApiProperty({ description: 'What the shopkeeper typed; zero from the cart.' }) manualDiscountCents!: number;
  @ApiProperty({ description: 'Promotions, coupon and typed discount together.' }) discountCents!: number;
  @ApiProperty({ type: Number, nullable: true, description: "Null on a delivery whose fee is not agreed yet; zero on a pick-up." }) deliveryFeeCents!: number | null;
  @ApiProperty() totalCents!: number;
}
