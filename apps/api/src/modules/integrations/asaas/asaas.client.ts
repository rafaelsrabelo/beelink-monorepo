// App
import type { AsaasConfig } from './asaas.config.js';

/** Whose account a key opens, as Asaas's commercial information names it. */
export interface AsaasAccountInfo {
  name: string;
  /** The CPF or CNPJ with its punctuation taken out — digits, and the capital letters a newer CNPJ may hold; null when Asaas sent none. Masked before it is kept. */
  document: string | null;
}

/**
 * The payment events a shop's webhook sends: those that move a charge's state or its money. Asaas
 * sends nothing it was not asked for, and asking for more later means touching every shop's webhook.
 */
export const ASAAS_WEBHOOK_EVENTS = [
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_OVERDUE',
  'PAYMENT_DELETED',
  'PAYMENT_RESTORED',
  'PAYMENT_REFUNDED',
  'PAYMENT_PARTIALLY_REFUNDED',
  'PAYMENT_REFUND_IN_PROGRESS',
  'PAYMENT_REFUND_DENIED',
  'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
  'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CHARGEBACK_DISPUTE',
  'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
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
 * What bee-link asks of a shop's Asaas account, with the key the shopkeeper gave. A port: the module
 * binds it to `AsaasHttpClient`, and a test stands a fake Asaas in its place. An implementation
 * never keeps, logs or repeats the key: the caller seals it, and its errors carry Asaas's words only.
 */
export abstract class AsaasClient {
  /** Who the key belongs to — and so whether it is a key at all. */
  abstract account(config: AsaasConfig, apiKey: string): Promise<AsaasAccountInfo>;

  /** A webhook registered at the account, sending `ASAAS_WEBHOOK_EVENTS` in order; answers its id. */
  abstract createWebhook(config: AsaasConfig, apiKey: string, webhook: AsaasWebhookRequest): Promise<string>;

  /** The webhook removed from the account; one already gone is not a failure. */
  abstract deleteWebhook(config: AsaasConfig, apiKey: string, id: string): Promise<void>;
}
