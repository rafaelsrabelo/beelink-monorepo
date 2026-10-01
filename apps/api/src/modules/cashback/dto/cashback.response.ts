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
} from '@harness-monorepo/contracts';

// App
import { CASHBACK_ENTRY_KINDS, CASHBACK_EXPIRING_SOON_DAYS } from '../cashback.constants.js';

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

class CashbackCreditResponse implements CashbackCredit {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['PENDING', 'AVAILABLE'] }) status!: Extract<CashbackCreditStatus, 'PENDING' | 'AVAILABLE'>;
  @ApiProperty() amountCents!: number;
  @ApiProperty() remainingCents!: number;
  @ApiProperty({ nullable: true, type: Number, description: 'Null for a credit the shopkeeper gave.' }) orderNumber!: number | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) availableAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'Null never expires.' }) expiresAt!: string | null;
}

class CashbackEntryResponse implements CashbackEntry {
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
