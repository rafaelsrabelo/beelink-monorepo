// Types
import type { AsaasAccountApproval } from '@harness-monorepo/contracts';

// App
import type { AsaasConfig } from './asaas.config.js';

/** Whose account a key opens, as Asaas's commercial information names it. */
export interface AsaasAccountInfo {
  name: string;
  /** The CPF or CNPJ with its punctuation taken out — digits, and the capital letters a newer CNPJ may hold; null when Asaas sent none. Masked before it is kept. */
  document: string | null;
}

/**
 * The events a shop's webhook sends (BEELINK-206): every one that says where a charge's money is, or
 * that the charge changed, and the three that say a key of the account stopped working. Asaas sends
 * nothing it was not asked for, and asking for more later means touching every shop's webhook. None
 * of them is applied by what its body says: each makes bee-link read the shop's account.
 */
export const ASAAS_WEBHOOK_EVENTS = [
  'PAYMENT_AUTHORIZED',
  'PAYMENT_AWAITING_RISK_ANALYSIS',
  'PAYMENT_APPROVED_BY_RISK_ANALYSIS',
  'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
  'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
  'PAYMENT_UPDATED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_RECEIVED_IN_CASH_UNDONE',
  'PAYMENT_OVERDUE',
  'PAYMENT_DELETED',
  'PAYMENT_RESTORED',
  'PAYMENT_REFUNDED',
  'PAYMENT_PARTIALLY_REFUNDED',
  'PAYMENT_REFUND_IN_PROGRESS',
  'PAYMENT_REFUND_DENIED',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CHARGEBACK_DISPUTE',
  'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  'ACCESS_TOKEN_DISABLED',
  'ACCESS_TOKEN_DELETED',
  'ACCESS_TOKEN_EXPIRED',
] as const;

/** A webhook to register at a shop's account. */
export interface AsaasWebhookRequest {
  /** How the shopkeeper recognizes it in Asaas's panel. */
  name: string;
  url: string;
  /** Who Asaas warns when the queue pauses. */
  email: string;
  /** Sent back in `asaas-access-token` with every event: 32 to 255 characters, no spaces. */
  authToken: string;
}

/** What Asaas charges an order with here: boleto is out of the first version. */
export type AsaasBillingType = 'PIX' | 'CREDIT_CARD';

/** A shop's customer to be registered at the shop's account. */
export interface AsaasCustomerRequest {
  name: string;
  /** Digits only. */
  cpf: string;
  /** bee-link's id of the customer's record. */
  externalReference: string;
}

/** A charge to be made. Cents and days: the implementation converts to what Asaas takes. */
export interface AsaasChargeRequest {
  /** Asaas's id of the customer, `cus_…`. */
  customerId: string;
  billingType: AsaasBillingType;
  /** The whole amount, whatever it is split into. */
  totalCents: number;
  /** 1 is in full; from 2 on, Asaas makes one charge per instalment and answers the first. */
  installments: number;
  /** `YYYY-MM-DD`, a day of Brasília's calendar. */
  dueDate: string;
  description: string;
  /** bee-link's id of the order: how a charge is found again. */
  externalReference: string;
}

/** A charge as Asaas tells it — one instalment of a plan, when `installmentId` is set. */
export interface AsaasCharge {
  /** `pay_…`. */
  id: string;
  /** Asaas's own word: `PENDING`, `CONFIRMED`, `AWAITING_RISK_ANALYSIS`… — one it adds later is not a failure. */
  status: string;
  deleted: boolean;
  billingType: string;
  /** This charge's own amount: an instalment's, on a plan. */
  valueCents: number;
  /** `YYYY-MM-DD`. */
  dueDate: string;
  /** Asaas's hosted invoice, only when it is `https`: it opens in the customer's browser. */
  invoiceUrl: string | null;
  /** The plan it belongs to; null on a charge in full. */
  installmentId: string | null;
  installmentNumber: number | null;
  externalReference: string | null;
  /** Every refund Asaas keeps of it, whatever came of each; empty when it sent none. */
  refunds: AsaasRefund[];
}

/**
 * One refund of a charge, as Asaas tells it (BEELINK-208). It has no id there. Only `DONE` is money
 * back; `CANCELLED` gave nothing back; `PENDING` and the words that wait for an authorization are
 * on their way — and so is a word Asaas adds later.
 */
export interface AsaasRefund {
  status: string;
  valueCents: number;
}

/** A charge's refunds read on their own — one charge's, or a whole instalment plan's. */
export interface AsaasRefundsRead {
  /** Asaas says the charge itself is `REFUNDED`: all of it went back, whatever the list holds. Never said of a plan. */
  whole: boolean;
  refunds: AsaasRefund[];
}

/** Which charge a refund is of: a plan is refunded, and read, as the one thing it is. */
export interface AsaasRefundTarget {
  id: string;
  installmentId: string | null;
}

/** A Pix charge's code, to be paid once. */
export interface AsaasPixQrCode {
  /** The copy-and-paste code. */
  payload: string;
  /** A PNG in base64. */
  encodedImage: string;
  /** When the code stops being paid; null when Asaas sent no date it could be read from. */
  expiresAt: Date | null;
}

/** Asaas answered, and said no: the key is not good, belongs to the other environment, or the request was refused. */
export class AsaasRefused extends Error {
  constructor(
    readonly status: number,
    /** Asaas's own code — `invalid_environment`, `invalid_access_token`… — or null when it sent none. */
    readonly code: string | null,
    readonly reason: string,
  ) {
    super(`Asaas refused (${status}${code ? `, ${code}` : ''}): ${reason}`);
  }
}

/** Asaas did not answer, or answered with its own failure: nothing was decided, and trying again may work. */
export class AsaasUnreachable extends Error {}

/**
 * Asaas answered 429: the account's quota — 25,000 requests in twelve hours — or its rate is spent.
 * Nothing was decided; `retryAt` is when Asaas said to ask again (`RateLimit-Reset`), when it said.
 */
export class AsaasThrottled extends AsaasUnreachable {
  constructor(
    message: string,
    readonly retryAt: Date | null,
  ) {
    super(message);
  }
}

/** Where a webhook registered at a shop's account stands there. */
export interface AsaasWebhookStanding {
  enabled: boolean;
  /** Asaas stopped sending after fifteen failures in a row; what it holds waits up to fourteen days. */
  interrupted: boolean;
}

/**
 * No answer to a request that creates: Asaas may have made the charge or not. Whoever asked must not
 * ask again before looking for what the first request left.
 */
export class AsaasOutcomeUnknown extends AsaasUnreachable {}

/**
 * What bee-link asks of a shop's Asaas account, with the key the shopkeeper gave. A port: the module
 * binds it to `AsaasHttpClient`, and a test stands a fake Asaas in its place. An implementation
 * never keeps, logs or repeats the key: the caller seals it, and its errors carry Asaas's words only.
 */
export abstract class AsaasClient {
  /** Who the key belongs to — and so whether it is a key at all. */
  abstract account(config: AsaasConfig, apiKey: string): Promise<AsaasAccountInfo>;

  /**
   * Asaas's verdict on the account's whole registration (BEELINK-278) — `general`, of
   * `GET /v3/myAccount/status` — or null when it answered a word bee-link does not know: one Asaas
   * adds later decides nothing. No answer is thrown, as everywhere.
   */
  abstract approval(config: AsaasConfig, apiKey: string): Promise<AsaasAccountApproval | null>;

  /** A webhook registered at the account, sending `ASAAS_WEBHOOK_EVENTS` in order; answers its id. */
  abstract createWebhook(config: AsaasConfig, apiKey: string, webhook: AsaasWebhookRequest): Promise<string>;

  /** The webhook removed from the account; one already gone is not a failure. */
  abstract deleteWebhook(config: AsaasConfig, apiKey: string, id: string): Promise<void>;

  /** Where the webhook stands at the account; null when the account has none such — removed there by hand. */
  abstract webhook(config: AsaasConfig, apiKey: string, id: string): Promise<AsaasWebhookStanding | null>;

  /** The webhook set to send again — on, its queue no longer interrupted: what Asaas held meanwhile is then sent. */
  abstract resumeWebhook(config: AsaasConfig, apiKey: string, id: string): Promise<void>;

  /** Asaas's id of the customer with this CPF at the account — one not removed — or null: looked for before any is created, since Asaas takes duplicates. */
  abstract findCustomer(config: AsaasConfig, apiKey: string, cpf: string): Promise<string | null>;

  /** A customer registered at the account, with Asaas's own notifications off: bee-link is who tells them. Answers its id. */
  abstract createCustomer(config: AsaasConfig, apiKey: string, customer: AsaasCustomerRequest): Promise<string>;

  /** Every charge of the account made for this reference and not removed — each instalment of a plan is one. */
  abstract charges(config: AsaasConfig, apiKey: string, externalReference: string): Promise<AsaasCharge[]>;

  /** One charge by its id, removed or not; null when the account has none such. */
  abstract charge(config: AsaasConfig, apiKey: string, id: string): Promise<AsaasCharge | null>;

  /** A charge made — the first instalment, on a plan. No answer is `AsaasOutcomeUnknown`: it may exist. */
  abstract createCharge(config: AsaasConfig, apiKey: string, charge: AsaasChargeRequest): Promise<AsaasCharge>;

  /** A charge removed, so it can no longer be paid; one already gone is not a failure. Refused for one that cannot be removed — a paid one. */
  abstract deleteCharge(config: AsaasConfig, apiKey: string, id: string): Promise<void>;

  /** A whole instalment plan removed, every charge of it; one already gone is not a failure. */
  abstract deleteInstallment(config: AsaasConfig, apiKey: string, id: string): Promise<void>;

  /**
   * Money given back from a charge — from the whole plan, when it is one (BEELINK-208). The amount
   * is always sent. Answers the charge's refunds as they stand then. No answer is
   * `AsaasOutcomeUnknown`: it may have been made, and `refundsOf` is asked before anything else is.
   */
  abstract refund(config: AsaasConfig, apiKey: string, charge: AsaasRefundTarget, refund: { valueCents: number; description: string }): Promise<AsaasRefundsRead>;

  /** The refunds of a charge, or of a plan, read by its id; null when the account has none such. */
  abstract refundsOf(config: AsaasConfig, apiKey: string, charge: AsaasRefundTarget): Promise<AsaasRefundsRead | null>;

  /** A Pix charge's code and QR. */
  abstract pixQrCode(config: AsaasConfig, apiKey: string, id: string): Promise<AsaasPixQrCode>;
}
