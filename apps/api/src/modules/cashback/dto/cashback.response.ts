// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  CashbackCredit,
  CashbackCreditStatus,
  CashbackEntry,
  CashbackEntryKind,
  CashbackExpiringSoonDays,
  CashbackOverview,
  CashbackOwed,
  CashbackSettings,
  CustomerCashback,
  CustomerDataCashback,
  OrderCashback,
  ShopOrderCashback,
} from '@harness-monorepo/contracts';

// App
import { CASHBACK_CREDIT_STATUSES, CASHBACK_ENTRY_KINDS, CASHBACK_EXPIRING_SOON_DAYS } from '../cashback.constants.js';

export class CashbackSettingsResponse implements CashbackSettings {
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ example: 500, description: 'Basis points (500 = 5.00%).' }) rateBps!: number;
  @ApiProperty({ nullable: true, type: Number, description: 'Null never expires.' }) expiresAfterDays!: number | null;
  @ApiProperty() minSubtotalCents!: number;
  @ApiProperty({ example: 10000 }) maxRedeemBps!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'Null until first saved: the defaults.' }) updatedAt!: string | null;
}

class CashbackOwedResponse implements CashbackOwed {
  @ApiProperty() availableCents!: number;
  @ApiProperty() pendingCents!: number;
  @ApiProperty() expiringSoonCents!: number;
  @ApiProperty({ enum: [CASHBACK_EXPIRING_SOON_DAYS] }) expiringSoonDays!: CashbackExpiringSoonDays;
}

export class CashbackOverviewResponse implements CashbackOverview {
  @ApiProperty({ type: CashbackSettingsResponse }) settings!: CashbackSettingsResponse;
  @ApiProperty({ type: CashbackOwedResponse }) owed!: CashbackOwedResponse;
}

export class CashbackCreditResponse implements CashbackCredit {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['PENDING', 'AVAILABLE'] }) status!: Extract<CashbackCreditStatus, 'PENDING' | 'AVAILABLE'>;
  @ApiProperty() amountCents!: number;
  @ApiProperty() remainingCents!: number;
  @ApiProperty({ nullable: true, type: Number, description: 'Null for a credit the shopkeeper gave.' }) orderNumber!: number | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) availableAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'Null never expires.' }) expiresAt!: string | null;
}

export class CashbackEntryResponse implements CashbackEntry {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: CASHBACK_ENTRY_KINDS }) kind!: CashbackEntryKind;
  @ApiProperty({ description: 'Signed, never 0.' }) amountCents!: number;
  @ApiProperty({ nullable: true, type: Number }) orderNumber!: number | null;
  @ApiProperty({ nullable: true, type: String, description: "The shopkeeper's, on an ADJUST." }) reason!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

class CashbackNextExpiryResponse {
  @ApiProperty() amountCents!: number;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}

export class CustomerCashbackResponse implements CustomerCashback {
  @ApiProperty({ description: 'What the customer can spend now: the statement\'s sum.' }) balanceCents!: number;
  @ApiProperty({ description: 'What undelivered orders will earn.' }) pendingCents!: number;
  @ApiProperty({ nullable: true, type: CashbackNextExpiryResponse }) nextExpiry!: CashbackNextExpiryResponse | null;
  @ApiProperty({ type: [CashbackCreditResponse] }) credits!: CashbackCreditResponse[];
  @ApiProperty({ type: [CashbackEntryResponse] }) entries!: CashbackEntryResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class OrderCashbackResponse implements OrderCashback {
  @ApiProperty({ description: 'Worked out when placed, never changed after.' }) earnedCents!: number;
  @ApiProperty({ example: 500 }) rateBps!: number;
  @ApiProperty({ enum: CASHBACK_CREDIT_STATUSES }) status!: CashbackCreditStatus;
  @ApiProperty({ description: 'While pending, what the delivery will make usable; once usable, what is left.' }) remainingCents!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) availableAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) expiresAt!: string | null;
}

export class ShopOrderCashbackResponse extends OrderCashbackResponse implements ShopOrderCashback {
  @ApiProperty({ description: 'What the customer had spent of it when the order was undone, which the balance did not take back.' }) unrecoveredCents!: number;
}

export class CustomerDataCashbackResponse implements CustomerDataCashback {
  @ApiProperty() balanceCents!: number;
  @ApiProperty() pendingCents!: number;
  @ApiProperty({ type: [CashbackCreditResponse] }) credits!: CashbackCreditResponse[];
  @ApiProperty({ type: [CashbackEntryResponse] }) entries!: CashbackEntryResponse[];
}
