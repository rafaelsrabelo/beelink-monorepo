// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  CustomerOrderPayment,
  CustomerOrderPaymentAnswer,
  OnlinePaymentMethod,
  OrderPayment,
  OrderPaymentBrief,
  OrderPaymentChannel,
  OrderPaymentFilter,
  OrderPaymentPix,
  OrderPaymentStatus,
  OrderRefund,
  OrderRefundOrigin,
  OrderRefundStatus,
  ShopOrderRefund,
  ShopOrderPayment,
  StrayPayment,
  StrayPaymentReason,
  StorefrontOnlinePayments,
  StorefrontPaymentOptions,
} from '@harness-monorepo/contracts';

// App
import { ORDER_PAYMENT_STATUSES } from '../payment-status.js';

export const ORDER_PAYMENT_CHANNELS = ['OFFLINE', 'ONLINE'] as const satisfies readonly OrderPaymentChannel[];
export const ONLINE_PAYMENT_METHODS = ['PIX', 'CREDIT_CARD'] as const satisfies readonly OnlinePaymentMethod[];

export class OrderPaymentBriefResponse implements OrderPaymentBrief {
  @ApiProperty({ enum: ORDER_PAYMENT_STATUSES }) status!: OrderPaymentStatus;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) expiresAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) paidAt!: string | null;
  @ApiProperty({ description: 'What is on its way back to the customer: refunds Asaas took and has not concluded.' }) refundingCents!: number;
}

export const ORDER_REFUND_STATUSES = ['REQUESTED', 'PROCESSING', 'DONE', 'REFUSED', 'DENIED'] as const satisfies readonly OrderRefundStatus[];
export const ORDER_REFUND_ORIGINS = ['PANEL', 'CANCELLATION', 'ASAAS'] as const satisfies readonly OrderRefundOrigin[];

export class OrderRefundResponse implements OrderRefund {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() amountCents!: number;
  @ApiProperty({ enum: ORDER_REFUND_STATUSES, description: 'PROCESSING was taken by Asaas and is not concluded; DONE is money back. The customer reads only these two.' }) status!: OrderRefundStatus;
  @ApiProperty({ format: 'date-time' }) requestedAt!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) doneAt!: string | null;
}

export class ShopOrderRefundResponse extends OrderRefundResponse implements ShopOrderRefund {
  @ApiProperty({ enum: ORDER_REFUND_ORIGINS, description: "Asked on the order's page, with its cancellation, or made at Asaas's own panel." }) origin!: OrderRefundOrigin;
  @ApiProperty({ nullable: true, type: String }) reason!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'On a REFUSED or DENIED one: what Asaas said, in its words.' }) lastError!: string | null;
  @ApiProperty({ description: "It gave back money the order did not ask for, not the order's own payment." }) stray!: boolean;
}

export const ORDER_PAYMENT_FILTERS = ['PAID', 'PENDING', 'PAID_UNSEEN', 'STRAY', 'REFUNDED'] as const satisfies readonly OrderPaymentFilter[];

export class OrderPaymentResponse implements OrderPayment {
  @ApiProperty({ enum: ORDER_PAYMENT_STATUSES, description: 'Paid is CONFIRMED or RECEIVED. CANCELLED was removed from Asaas; FAILED is one Asaas refused to create.' }) status!: OrderPaymentStatus;
  @ApiProperty({ enum: ONLINE_PAYMENT_METHODS }) method!: OnlinePaymentMethod;
  @ApiProperty({ minimum: 1, maximum: 12, description: '1 is in full.' }) installments!: number;
  @ApiProperty() amountCents!: number;
  @ApiProperty({ description: 'What went back to the customer for good.' }) refundedCents!: number;
  @ApiProperty({ description: 'What is on its way back: refunds Asaas took and has not concluded.' }) refundingCents!: number;
  @ApiProperty({ type: [OrderRefundResponse], description: 'Its refunds, the oldest first.' }) refunds!: OrderRefundResponse[];
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'Until when it is offered to be paid here: the end of its due day in Brasília.' }) expiresAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) paidAt!: string | null;
}

export const STRAY_PAYMENT_REASONS = ['ORDER_CANCELLED', 'ORDER_ALREADY_PAID'] as const satisfies readonly StrayPaymentReason[];

export class StrayPaymentResponse implements StrayPayment {
  @ApiProperty({ format: 'uuid', description: 'What a refund of it is asked with.' }) id!: string;
  @ApiProperty({ enum: STRAY_PAYMENT_REASONS, description: 'The order had been cancelled when it was paid, or was already paid by another charge.' }) reason!: StrayPaymentReason;
  @ApiProperty({ enum: ONLINE_PAYMENT_METHODS }) method!: OnlinePaymentMethod;
  @ApiProperty() amountCents!: number;
  @ApiProperty({ format: 'date-time', description: 'When bee-link learned of it.' }) paidAt!: string;
  @ApiProperty({ description: 'What of it is still to be given back.' }) refundableCents!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'When Asaas took the refund of all of it; null while the shop still has to settle it.' }) resolvedAt!: string | null;
}

export class ShopOrderPaymentResponse extends OrderPaymentResponse implements ShopOrderPayment {
  @ApiProperty({ type: [ShopOrderRefundResponse], description: "Every refund of the order — its payment's and a stray one's, taken or refused." }) declare refunds: ShopOrderRefundResponse[];
  @ApiProperty({ description: 'What a refund may still ask for; zero on a charge that holds no money.' }) refundableCents!: number;
  @ApiProperty({ nullable: true, type: String, example: 'AWAITING_RISK_ANALYSIS', description: "The status in Asaas's own word." }) providerStatus!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'What Asaas last refused about it, in its words.' }) lastError!: string | null;
  @ApiProperty({ type: [StrayPaymentResponse], description: "Money at the shop's Asaas account that the order did not ask for; the shop refunds it from the order." }) strays!: StrayPaymentResponse[];
  @ApiProperty({ description: 'Paid, and nobody at the shop opened the order since: the bell still tells of it (BEELINK-207).' }) unseen!: boolean;
}

export class OrderPaymentPixResponse implements OrderPaymentPix {
  @ApiProperty({ description: 'The copy-and-paste code.' }) payload!: string;
  @ApiProperty({ description: 'The QR code, a PNG in base64.' }) image!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}

export class CustomerOrderPaymentResponse extends OrderPaymentResponse implements CustomerOrderPayment {
  @ApiProperty({ type: OrderPaymentPixResponse, nullable: true, description: 'On a Pix still to be paid; null while Asaas has not given the code.' }) pix!: OrderPaymentPixResponse | null;
  @ApiProperty({ nullable: true, type: String, description: "Asaas's hosted invoice, on a card still to be paid: opened in a new tab." }) invoiceUrl!: string | null;
}

export class CustomerOrderPaymentAnswerResponse implements CustomerOrderPaymentAnswer {
  @ApiProperty({ type: CustomerOrderPaymentResponse, nullable: true, description: 'Null on an order settled with the shop, and on one charged online with no charge yet.' })
  payment!: CustomerOrderPaymentResponse | null;
}

export class StorefrontOnlinePaymentsResponse implements StorefrontOnlinePayments {
  @ApiProperty() pix!: boolean;
  @ApiProperty() card!: boolean;
  @ApiProperty({ minimum: 1, maximum: 12, description: 'The most instalments a card is charged in, with no interest to the customer.' }) maxInstallments!: number;
  @ApiProperty({ example: 500, description: "Asaas's least charge, in cents." }) minimumChargeCents!: number;
  @ApiProperty({ example: 500, description: "Asaas's least instalment on a card, in cents." }) minimumInstallmentCents!: number;
}

export class StorefrontPaymentOptionsResponse implements StorefrontPaymentOptions {
  @ApiProperty({ type: StorefrontOnlinePaymentsResponse, nullable: true, description: 'Null when nothing is charged online: no Asaas in good standing, or Pix and card both off.' })
  online!: StorefrontOnlinePaymentsResponse | null;
  @ApiProperty({ description: "Paying on delivery or at pickup, by the shop's own labels. Always true while `online` is null." }) offline!: boolean;
}
