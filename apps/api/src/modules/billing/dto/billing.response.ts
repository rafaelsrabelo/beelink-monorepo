// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  BillingAccount,
  BillingAccountAnswer,
  BillingCycle,
  BillingCycleMonths,
  BillingDocumentType,
  PageLockReason,
  Plan,
  PlanCatalog,
  PlanCycle,
  StoreSubscription,
  StoreSubscriptionAnswer,
  SubscriptionCard,
  SubscriptionChoice,
  SubscriptionPaymentMethod,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@harness-monorepo/contracts';

// App
import { BILLING_CYCLES, BILLING_DOCUMENT_TYPES, CYCLE_MONTHS, PAGE_LOCK_REASONS, SUBSCRIPTION_PAYMENT_METHODS, SUBSCRIPTION_STATUSES } from '../billing.constants.js';

/** Documents the shapes for Swagger; the wire types themselves live in packages/contracts. */

class PlanCycleResponse implements PlanCycle {
  @ApiProperty({ enum: BILLING_CYCLES }) cycle!: BillingCycle;
  @ApiProperty({ enum: Object.values(CYCLE_MONTHS) }) months!: BillingCycleMonths;
  @ApiProperty({ example: 32340, description: 'Whole cents for the whole cycle, not a month of it.' }) priceCents!: number;
}

class PlanResponse implements Plan {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'beelink' }) slug!: string;
  @ApiProperty({ example: 'Beelink' }) name!: string;
  @ApiProperty({ type: [PlanCycleResponse], description: 'Only the cycles it is sold in, shortest first.' }) cycles!: PlanCycleResponse[];
}

export class PlanCatalogResponse implements PlanCatalog {
  @ApiProperty({ example: 7, description: 'The days a new page is used before anything is owed.' }) trialDays!: number;
  @ApiProperty({ type: [PlanResponse], description: 'The plans on sale, cheapest by the month first.' }) plans!: PlanResponse[];
}

class SubscriptionPlanResponse implements SubscriptionPlan {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'beelink' }) slug!: string;
  @ApiProperty({ example: 'Beelink' }) name!: string;
}

class SubscriptionCardResponse implements SubscriptionCard {
  @ApiProperty({ example: 'MASTERCARD', description: "In Asaas's word." }) brand!: string;
  @ApiProperty({ example: '8829' }) last4!: string;
}

class StoreSubscriptionResponse implements StoreSubscription {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: SUBSCRIPTION_STATUSES, description: 'As it stands at the instant of the read: a trial past its end reads TRIAL_EXPIRED.' }) status!: SubscriptionStatus;
  @ApiProperty({ format: 'date-time' }) trialStartedAt!: string;
  @ApiProperty({ format: 'date-time', description: 'The first instant the trial is over: a midnight in Brasília.' }) trialEndsAt!: string;
  @ApiProperty({ format: 'date', example: '2026-10-20', description: "The last day the trial covers, on Brasília's calendar." }) trialLastDay!: string;
  @ApiProperty({ example: 7, description: "Days of Brasília's calendar until `trialLastDay`; 0 on that day and after it." }) trialDaysLeft!: number;
  @ApiProperty({ nullable: true, type: SubscriptionPlanResponse, description: 'Null until the shopkeeper chooses one.' }) plan!: SubscriptionPlanResponse | null;
  @ApiProperty({ enum: BILLING_CYCLES, nullable: true, type: String }) cycle!: BillingCycle | null;
  @ApiProperty({ nullable: true, type: Number, description: 'What the cycle costs this page, as agreed when it was chosen.' }) priceCents!: number | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'The first instant the paid period is over.' }) currentPeriodEndsAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) cancelRequestedAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'The first instant a free period given by a coupon is over.' }) freePeriodEndsAt!: string | null;
  @ApiProperty({ enum: SUBSCRIPTION_PAYMENT_METHODS, nullable: true, type: String }) paymentMethod!: SubscriptionPaymentMethod | null;
  @ApiProperty({ nullable: true, type: String, description: "Asaas's page for the charge waiting to be paid." }) invoiceUrl!: string | null;
  @ApiProperty({ nullable: true, type: SubscriptionCardResponse, description: 'All that is kept of a card.' }) card!: SubscriptionCardResponse | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time', description: 'The first instant a page past due is locked: seven days after its paid period. Null unless past due or suspended.' }) graceEndsAt!: string | null;
  @ApiProperty({ enum: PAGE_LOCK_REASONS, nullable: true, type: String, description: 'Why the page is locked now, or null while it is open — always null where nothing locks.' }) lock!: PageLockReason | null;
}

export class StoreSubscriptionAnswerResponse implements StoreSubscriptionAnswer {
  @ApiProperty({ description: 'Whether this deployment charges and locks. False: the panel shows nothing of a plan.' }) billingEnforced!: boolean;
  @ApiProperty({ nullable: true, type: StoreSubscriptionResponse, description: 'Null for a page from before subscriptions existed.' }) subscription!: StoreSubscriptionResponse | null;
}

export class SubscriptionChoiceResponse implements SubscriptionChoice {
  @ApiProperty({ example: 'https://www.asaas.com/i/5l0awjywsem91403', description: "Asaas's own page for the page's first charge: a card, Pix or a boleto, chosen there." }) invoiceUrl!: string;
  @ApiProperty({ type: StoreSubscriptionResponse, description: 'The subscription as it now reads: the plan, the cycle and the price chosen. Its `status` is not changed by choosing.' }) subscription!: StoreSubscriptionResponse;
}

export class BillingAccountResponse implements BillingAccount {
  @ApiProperty({ example: 'Maria Souza Lima' }) name!: string;
  @ApiProperty({ example: '***.982.247-**', description: 'Never whole: a CPF as `***.982.247-**`, a CNPJ as `**.222.333/0001-**`.' }) document!: string;
  @ApiProperty({ enum: BILLING_DOCUMENT_TYPES }) documentType!: BillingDocumentType;
  @ApiProperty({ description: "Whether bee-link's Asaas account holds this account as a customer, with this name and document. False after a save Asaas refused or did not answer: saving again asks again." }) customerReady!: boolean;
}

export class BillingAccountAnswerResponse implements BillingAccountAnswer {
  @ApiProperty({ nullable: true, type: BillingAccountResponse, description: 'Null for an account that never gave its billing data.' }) account!: BillingAccountResponse | null;
}
