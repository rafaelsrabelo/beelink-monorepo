// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  AffiliateCommissionStatus,
  AffiliateCommissionZeroReason,
  AffiliateHome,
  AffiliateNextPayment,
  AffiliateNumbers,
  AffiliateOrder,
  AffiliateOrderPage,
  AffiliatePayoutMethod,
  AffiliatePayoutPage,
  AffiliateProductLink,
  AffiliateProductPage,
  AffiliateProfile,
  AffiliateReceivedPayout,
  AffiliateShop,
  AffiliateStatus,
  OrderStatus,
} from '@harness-monorepo/contracts';

// App
import { AFFILIATE_PAYOUT_METHODS } from '../affiliates.constants.js';

type Standing = Exclude<AffiliateStatus, 'INVITED'>;
const STANDINGS = ['ACTIVE', 'PAUSED', 'ENDED'] as const satisfies readonly Standing[];
const COMMISSION_STATUSES = ['PENDING', 'AVAILABLE', 'REVERSED'] as const satisfies readonly AffiliateCommissionStatus[];
const ORDER_STATUSES = ['RECEIVED', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as const satisfies readonly OrderStatus[];

class AffiliateAreaStoreResponse {
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) logoUrl!: string | null;
}

export class AffiliateShopResponse implements AffiliateShop {
  @ApiProperty({ type: AffiliateAreaStoreResponse }) store!: AffiliateAreaStoreResponse;
  @ApiProperty({ description: 'Their `/name` at the shop.' }) slug!: string;
  @ApiProperty({ enum: STANDINGS }) status!: Standing;
  @ApiProperty({ description: 'May be below zero.' }) availableCents!: number;
  @ApiProperty() pendingCents!: number;
}

export class AffiliateProfileResponse implements AffiliateProfile {
  @ApiProperty({ nullable: true, type: String }) pixKey!: string | null;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty({ nullable: true, type: String, example: '***.982.247-**', description: 'Their CPF as the shop registered it, masked and read-only.' }) maskedCpf!: string | null;
  @ApiProperty({ nullable: true, type: String }) photoUrl!: string | null;
  @ApiProperty({ nullable: true, type: String }) tagline!: string | null;
}

class AffiliateNumbersResponse implements AffiliateNumbers {
  @ApiProperty({ example: 30 }) days!: number;
  @ApiProperty() visits!: number;
  @ApiProperty() orders!: number;
  @ApiProperty() sales!: number;
  @ApiProperty() commissionCents!: number;
}

class AffiliateNextDueResponse {
  @ApiProperty({ format: 'date' }) dueOn!: string;
  @ApiProperty() amountCents!: number;
}

class AffiliateNextPaymentResponse implements AffiliateNextPayment {
  @ApiProperty({ description: 'Owed now; the shop pays it outside bee-link.' }) availableCents!: number;
  @ApiProperty({ nullable: true, type: AffiliateNextDueResponse }) next!: AffiliateNextDueResponse | null;
}

class AffiliateAreaTableResponse {
  @ApiProperty() name!: string;
  @ApiProperty({ example: 1000 }) defaultRateBps!: number;
}

class AffiliateAreaSelfResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: STANDINGS }) status!: Standing;
  @ApiProperty({ type: AffiliateAreaTableResponse }) table!: AffiliateAreaTableResponse;
}

export class AffiliateHomeResponse implements AffiliateHome {
  @ApiProperty({ type: AffiliateAreaStoreResponse }) store!: AffiliateAreaStoreResponse;
  @ApiProperty({ type: AffiliateAreaSelfResponse }) affiliate!: AffiliateAreaSelfResponse;
  @ApiProperty() linksCredit!: boolean;
  @ApiProperty({ nullable: true, type: String, example: '/loja-da-ana/maria' }) linkPath!: string | null;
  @ApiProperty() pendingCents!: number;
  @ApiProperty() availableCents!: number;
  @ApiProperty({ type: AffiliateNextPaymentResponse }) payment!: AffiliateNextPaymentResponse;
  @ApiProperty({ type: AffiliateNumbersResponse }) numbers!: AffiliateNumbersResponse;
  @ApiProperty({ type: AffiliateProfileResponse }) profile!: AffiliateProfileResponse;
}

class AffiliateProductLinkResponse implements AffiliateProductLink {
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) imageUrl!: string | null;
  @ApiProperty() priceCents!: number;
  @ApiProperty({ example: 1000 }) rateBps!: number;
  @ApiProperty({ example: '/loja-da-ana/produtos/bolsa?afiliado=maria' }) path!: string;
}

export class AffiliateProductPageResponse implements AffiliateProductPage {
  @ApiProperty({ type: [AffiliateProductLinkResponse] }) products!: AffiliateProductLinkResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

class AffiliateOrderItemResponse {
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) variantLabel!: string | null;
  @ApiProperty() quantity!: number;
}

class AffiliateOrderCommissionResponse {
  @ApiProperty({ enum: COMMISSION_STATUSES }) status!: AffiliateCommissionStatus;
  @ApiProperty() baseCents!: number;
  @ApiProperty() commissionCents!: number;
  @ApiProperty({ nullable: true, enum: ['OWN_PURCHASE'] }) zeroReason!: AffiliateCommissionZeroReason | null;
  @ApiProperty({ nullable: true, type: String, format: 'date' }) dueOn!: string | null;
}

class AffiliateOrderResponse implements AffiliateOrder {
  @ApiProperty() number!: number;
  @ApiProperty({ format: 'date-time' }) placedAt!: string;
  @ApiProperty({ enum: ORDER_STATUSES }) status!: OrderStatus;
  @ApiProperty({ description: "The customer's name, and nothing else of them." }) customerName!: string;
  @ApiProperty({ type: [AffiliateOrderItemResponse] }) items!: AffiliateOrderItemResponse[];
  @ApiProperty({ type: AffiliateOrderCommissionResponse }) commission!: AffiliateOrderCommissionResponse;
}

export class AffiliateOrderPageResponse implements AffiliateOrderPage {
  @ApiProperty({ type: [AffiliateOrderResponse] }) orders!: AffiliateOrderResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

class AffiliateReceivedPayoutResponse implements AffiliateReceivedPayout {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() amountCents!: number;
  @ApiProperty({ format: 'date' }) paidOn!: string;
  @ApiProperty({ enum: AFFILIATE_PAYOUT_METHODS }) method!: AffiliatePayoutMethod;
  @ApiProperty({ nullable: true, type: String }) note!: string | null;
}

export class AffiliatePayoutPageResponse implements AffiliatePayoutPage {
  @ApiProperty({ type: [AffiliateReceivedPayoutResponse] }) payouts!: AffiliateReceivedPayoutResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
