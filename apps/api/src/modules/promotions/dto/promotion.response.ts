// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  Coupon,
  CouponKind,
  CouponPage,
  CouponRedemption,
  CouponRedemptionPage,
  CouponStatus,
  DiscountAudience,
  DiscountKind,
  OrderStatus,
  Promotion,
  PromotionPage,
  PromotionScope,
  PromotionStatus,
  PromotionTarget,
} from '@harness-monorepo/contracts';

// App
import { ORDER_STATUSES } from '../../orders/orders.constants.js';
import { COUPON_KINDS, COUPON_STATUSES, DISCOUNT_AUDIENCES, DISCOUNT_KINDS, PROMOTION_SCOPES, PROMOTION_STATUSES } from '../promotions.constants.js';

class PromotionTargetResponse implements PromotionTarget {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
}

export class PromotionResponse implements Promotion {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: PROMOTION_SCOPES }) scope!: PromotionScope;
  @ApiProperty({ enum: DISCOUNT_KINDS }) discountKind!: DiscountKind;
  @ApiProperty({ nullable: true, type: Number, example: 1000, description: 'Basis points (1000 = 10.00%); null unless PERCENT.' }) percentBps!: number | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Whole cents; null unless FIXED.' }) amountCents!: number | null;
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'Null runs until paused.' }) endsAt!: string | null;
  @ApiProperty({ description: "The owner's switch: false is paused." }) active!: boolean;
  @ApiProperty({ enum: PROMOTION_STATUSES, description: 'Read from the clock when answered.' }) status!: PromotionStatus;
  @ApiProperty({ enum: DISCOUNT_AUDIENCES, description: 'Who it is for: FIRST_PURCHASE is a customer with no order at the shop that stands.' }) audience!: DiscountAudience;
  @ApiProperty({ type: [PromotionTargetResponse] }) products!: PromotionTargetResponse[];
  @ApiProperty({ type: [PromotionTargetResponse] }) categories!: PromotionTargetResponse[];
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

class PromotionCountsResponse implements Record<'ALL' | PromotionStatus, number> {
  @ApiProperty() ALL!: number;
  @ApiProperty() ENDED!: number;
  @ApiProperty() PAUSED!: number;
  @ApiProperty() SCHEDULED!: number;
  @ApiProperty() ACTIVE!: number;
}

export class PromotionPageResponse implements PromotionPage {
  @ApiProperty({ type: [PromotionResponse] }) promotions!: PromotionResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: PromotionCountsResponse, description: 'Of every promotion, whatever the filter.' }) counts!: PromotionCountsResponse;
}

export class CouponResponse implements Coupon {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'BEMVINDO10' }) code!: string;
  @ApiProperty({ enum: COUPON_KINDS }) kind!: CouponKind;
  @ApiProperty({ nullable: true, type: Number, example: 1000 }) percentBps!: number | null;
  @ApiProperty({ nullable: true, type: Number }) amountCents!: number | null;
  @ApiProperty({ description: 'Zero asks for none.' }) minSubtotalCents!: number;
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'Null never expires.' }) endsAt!: string | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Null is no limit.' }) maxUses!: number | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Null is no limit.' }) maxUsesPerCustomer!: number | null;
  @ApiProperty({ description: 'How many uses count against maxUses.' }) usedCount!: number;
  @ApiProperty() active!: boolean;
  @ApiProperty({ enum: COUPON_STATUSES, description: 'Read from the clock when answered.' }) status!: CouponStatus;
  @ApiProperty({ enum: DISCOUNT_AUDIENCES, description: 'Who may use it: FIRST_PURCHASE is a customer with no order at the shop that stands.' }) audience!: DiscountAudience;
  @ApiProperty({ description: 'Whether the shop window may say this code to a customer it is for.' }) shownInStore!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

class CouponCountsResponse extends PromotionCountsResponse implements Record<'ALL' | CouponStatus, number> {
  @ApiProperty() EXHAUSTED!: number;
}

export class CouponPageResponse implements CouponPage {
  @ApiProperty({ type: [CouponResponse] }) coupons!: CouponResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: CouponCountsResponse, description: 'Of every coupon, whatever the filter.' }) counts!: CouponCountsResponse;
}

class RedemptionOrderResponse {
  @ApiProperty() number!: number;
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty() totalCents!: number;
  @ApiProperty({ format: 'date-time' }) placedAt!: string;
}

class RedemptionCustomerResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

export class CouponRedemptionResponse implements CouponRedemption {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: RedemptionOrderResponse }) order!: RedemptionOrderResponse;
  @ApiProperty({ type: RedemptionCustomerResponse }) customer!: RedemptionCustomerResponse;
  @ApiProperty({ description: 'What the coupon took off that order, in whole cents.' }) discountCents!: number;
  @ApiProperty({ format: 'date-time' }) redeemedAt!: string;
}

export class CouponRedemptionPageResponse implements CouponRedemptionPage {
  @ApiProperty({ type: [CouponRedemptionResponse] }) redemptions!: CouponRedemptionResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
