// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  AffiliateCommissionStatus,
  AffiliateCommissionZeroReason,
  AffiliateEntryKind,
  AffiliateOwed,
  AffiliateOwedDay,
  AffiliateOwedDayState,
  AffiliateOwedRow,
  AffiliatePayoutMethod,
  AffiliatePayoutSummary,
  AffiliateStatement,
  AffiliateStatementEntry,
  AffiliateStatus,
  OrderAffiliate,
  OrderAffiliateChange,
  OrderAffiliateCommission,
  OrderAffiliateParty,
} from '@harness-monorepo/contracts';

// App
import { AFFILIATE_PAYOUT_METHODS, AFFILIATE_STATUSES } from '../affiliates.constants.js';

const COMMISSION_STATUSES = ['PENDING', 'AVAILABLE', 'REVERSED'] as const satisfies readonly AffiliateCommissionStatus[];
const ENTRY_KINDS = ['RELEASED', 'REVERSED', 'ADJUSTED', 'PAID_OUT'] as const satisfies readonly AffiliateEntryKind[];
const DAY_STATES = ['OVERDUE', 'TODAY', 'UPCOMING'] as const satisfies readonly AffiliateOwedDayState[];

class OrderAffiliatePersonResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) slug!: string | null;
  @ApiProperty({ enum: AFFILIATE_STATUSES }) status!: AffiliateStatus;
}

class OrderAffiliateCommissionResponse implements OrderAffiliateCommission {
  @ApiProperty({ enum: COMMISSION_STATUSES }) status!: AffiliateCommissionStatus;
  @ApiProperty() baseCents!: number;
  @ApiProperty() commissionCents!: number;
  @ApiProperty() tableName!: string;
  @ApiProperty({ nullable: true, enum: ['OWN_PURCHASE'] }) zeroReason!: AffiliateCommissionZeroReason | null;
  @ApiProperty({ nullable: true, type: String, format: 'date' }) dueOn!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) availableAt!: string | null;
}

class OrderAffiliatePartyResponse implements OrderAffiliateParty {
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) id!: string | null;
  @ApiProperty() name!: string;
}

class OrderAffiliateChangeResponse implements OrderAffiliateChange {
  @ApiProperty({ nullable: true, type: OrderAffiliatePartyResponse }) from!: OrderAffiliatePartyResponse | null;
  @ApiProperty({ nullable: true, type: OrderAffiliatePartyResponse }) to!: OrderAffiliatePartyResponse | null;
  @ApiProperty() reason!: string;
  @ApiProperty({ format: 'date-time' }) at!: string;
}

export class OrderAffiliateResponse implements OrderAffiliate {
  @ApiProperty({ nullable: true, type: OrderAffiliatePersonResponse }) affiliate!: OrderAffiliatePersonResponse | null;
  @ApiProperty({ nullable: true, type: OrderAffiliateCommissionResponse }) commission!: OrderAffiliateCommissionResponse | null;
  @ApiProperty({ type: [OrderAffiliateChangeResponse] }) changes!: OrderAffiliateChangeResponse[];
  @ApiProperty({ description: 'Money given back on the order: the commission did not change by itself.' }) refundedCents!: number;
  @ApiProperty() changeable!: boolean;
}

class AffiliatePayoutSummaryResponse implements AffiliatePayoutSummary {
  @ApiProperty({ format: 'date' }) paidOn!: string;
  @ApiProperty({ enum: AFFILIATE_PAYOUT_METHODS }) method!: AffiliatePayoutMethod;
  @ApiProperty({ nullable: true, type: String }) note!: string | null;
}

class AffiliateStatementEntryResponse implements AffiliateStatementEntry {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ENTRY_KINDS }) kind!: AffiliateEntryKind;
  @ApiProperty({ description: 'Signed, never 0.' }) amountCents!: number;
  @ApiProperty({ nullable: true, type: Number }) orderNumber!: number | null;
  @ApiProperty({ nullable: true, type: String }) reason!: string | null;
  @ApiProperty({ nullable: true, type: AffiliatePayoutSummaryResponse }) payout!: AffiliatePayoutSummaryResponse | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class AffiliateStatementResponse implements AffiliateStatement {
  @ApiProperty() pendingCents!: number;
  @ApiProperty({ description: 'May be below zero.' }) availableCents!: number;
  @ApiProperty({ type: [AffiliateStatementEntryResponse] }) entries!: AffiliateStatementEntryResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

class AffiliateOwedDayResponse implements AffiliateOwedDay {
  @ApiProperty({ format: 'date' }) dueOn!: string;
  @ApiProperty() amountCents!: number;
  @ApiProperty() affiliateCount!: number;
  @ApiProperty({ enum: DAY_STATES }) state!: AffiliateOwedDayState;
}

class AffiliateOwedPersonResponse extends OrderAffiliatePersonResponse {
  @ApiProperty({ nullable: true, type: String }) pixKey!: string | null;
}

class AffiliateOwedRowResponse implements AffiliateOwedRow {
  @ApiProperty({ type: AffiliateOwedPersonResponse }) affiliate!: AffiliateOwedPersonResponse;
  @ApiProperty() availableCents!: number;
  @ApiProperty() pendingCents!: number;
  @ApiProperty({ nullable: true, type: String, format: 'date' }) oldestDueOn!: string | null;
  @ApiProperty() overdue!: boolean;
}

export class AffiliateOwedResponse implements AffiliateOwed {
  @ApiProperty({ format: 'date' }) today!: string;
  @ApiProperty() owedCents!: number;
  @ApiProperty({ type: [AffiliateOwedDayResponse] }) due!: AffiliateOwedDayResponse[];
  @ApiProperty() undatedCents!: number;
  @ApiProperty({ type: [AffiliateOwedDayResponse] }) upcoming!: AffiliateOwedDayResponse[];
  @ApiProperty() awaitingDeliveryCents!: number;
  @ApiProperty({ type: [AffiliateOwedRowResponse] }) affiliates!: AffiliateOwedRowResponse[];
}
