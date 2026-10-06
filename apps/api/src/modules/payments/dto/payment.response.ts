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
  OrderPaymentPix,
  OrderPaymentStatus,
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
}

export class OrderPaymentResponse implements OrderPayment {
  @ApiProperty({ enum: ORDER_PAYMENT_STATUSES, description: 'Paid is CONFIRMED or RECEIVED. CANCELLED was removed from Asaas; FAILED is one Asaas refused to create.' }) status!: OrderPaymentStatus;
  @ApiProperty({ enum: ONLINE_PAYMENT_METHODS }) method!: OnlinePaymentMethod;
  @ApiProperty({ minimum: 1, maximum: 12, description: '1 is in full.' }) installments!: number;
  @ApiProperty() amountCents!: number;
  @ApiProperty() refundedCents!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'Until when it is offered to be paid here: the end of its due day in Brasília.' }) expiresAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) paidAt!: string | null;
}

export const STRAY_PAYMENT_REASONS = ['ORDER_CANCELLED', 'ORDER_ALREADY_PAID'] as const satisfies readonly StrayPaymentReason[];

export class StrayPaymentResponse implements StrayPayment {
  @ApiProperty({ enum: STRAY_PAYMENT_REASONS, description: 'The order had been cancelled when it was paid, or was already paid by another charge.' }) reason!: StrayPaymentReason;
  @ApiProperty({ enum: ONLINE_PAYMENT_METHODS }) method!: OnlinePaymentMethod;
  @ApiProperty() amountCents!: number;
  @ApiProperty({ format: 'date-time', description: 'When bee-link learned of it.' }) paidAt!: string;
}

export class ShopOrderPaymentResponse extends OrderPaymentResponse implements ShopOrderPayment {
  @ApiProperty({ nullable: true, type: String, example: 'AWAITING_RISK_ANALYSIS', description: "The status in Asaas's own word." }) providerStatus!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'What Asaas last refused about it, in its words.' }) lastError!: string | null;
  @ApiProperty({ type: [StrayPaymentResponse], description: "Money at the shop's Asaas account that the order did not ask for; bee-link refunds nothing on its own." }) strays!: StrayPaymentResponse[];
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
