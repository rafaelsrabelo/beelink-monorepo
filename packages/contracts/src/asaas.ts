/**
 * A shop's Asaas account (docs/plans BEELINK-202): the shopkeeper's own, which bee-link creates
 * charges in with the API key the shopkeeper pasted. The key is sealed and never travels back.
 */

// Types
import type { IntegrationStatus } from "./integration.js";

/** Which Asaas this deployment talks to: the sandbox moves no money, production does. */
export type AsaasEnvironment = "SANDBOX" | "PRODUCTION";

/**
 * Where the webhook bee-link registered at the shop's account stands.
 * - `REGISTERED`: Asaas sends the shop's payment events.
 * - `SKIPPED`: none was registered, because this deployment's web is not public https (development).
 * - `PAUSED`: Asaas stopped sending after repeated failures; connecting again resumes it.
 * - `ERROR`: Asaas refused the registration, or did not answer it; connecting again retries.
 */
export type IntegrationWebhookState = "REGISTERED" | "SKIPPED" | "PAUSED" | "ERROR";

/**
 * Whether Asaas approved the shop's account (BEELINK-278), in Asaas's own words for its verdict on
 * the whole registration. Only an `APPROVED` account charges: Asaas refuses a Pix or a card of any other.
 * - `PENDING`: the shopkeeper has not sent Asaas everything it asks for.
 * - `AWAITING_APPROVAL`: sent, and being looked at by Asaas.
 * - `REJECTED`: Asaas turned the registration down; only the shopkeeper and Asaas mend it.
 */
export type AsaasAccountApproval = "PENDING" | "AWAITING_APPROVAL" | "APPROVED" | "REJECTED";

/** Whose Asaas account the shop connected, as that account names itself. */
export interface AsaasAccount {
  name: string;
  /** The account's CPF or CNPJ, masked — `***.456.789-**`, `**.345.678/0001-**`; never whole. Null when Asaas sent none. */
  document: string | null;
}

/**
 * `GET /stores/:slug/integrations/asaas`: the shop's connection. Never carries the key. Also what
 * `POST /stores/:slug/integrations/asaas/approval` answers (BEELINK-278), which takes no body: Asaas
 * asked again, now, whether it approved the account.
 */
export interface AsaasConnection {
  /** This deployment can seal a key. Without it nothing below can change. */
  available: boolean;
  environment: AsaasEnvironment;
  status: IntegrationStatus;
  /** Null while disconnected. */
  account: AsaasAccount | null;
  /** Null while disconnected. */
  webhook: IntegrationWebhookState | null;
  /**
   * Null while disconnected, and while it is not known — never read, or Asaas did not answer. Not
   * known switches nothing off: the checkout stops offering Pix and card only for an account read
   * as not `APPROVED`, which then sells as a shop with no Asaas does.
   */
  approval: AsaasAccountApproval | null;
  /** ISO-8601, when `approval` was last read at Asaas; null while it is. */
  approvalCheckedAt: string | null;
  /** ISO-8601; null while disconnected. */
  connectedAt: string | null;
}

/** `POST /stores/:slug/integrations/asaas`: connect, or replace the key connected before. */
export interface AsaasConnectPayload {
  /** As Asaas shows it, `$` included: `$aact_prod_…` in production, `$aact_hmlg_…` in the sandbox. */
  apiKey: string;
}

/**
 * `GET /stores/:slug/integrations/asaas/settings`: how the shop is paid once its Asaas account is
 * connected (BEELINK-203). Kept apart from the connection, so connecting again keeps the choices;
 * they are read and saved connected or not, and take effect only while connected. At least one of
 * `pix`, `card` and `offline` is on.
 */
export interface AsaasSettings {
  /** Pix, charged at Asaas. */
  pix: boolean;
  /** Credit card, charged at Asaas. */
  card: boolean;
  /**
   * The most instalments a card payment splits into, 1 to 12; 1 is in full. Interest-free to the
   * customer: Asaas's instalment fee is the shop's, which is why going past 1 is the shop's choice.
   * Kept while `card` is off, and worth nothing until it is on again.
   */
  maxInstallments: number;
  /** Paying on delivery or at pickup, settled between the shop and the customer: what a shop with no Asaas does. */
  offline: boolean;
  /** ISO-8601; null until first saved. What is read until then are the defaults: Pix and card in full, and paying on delivery. */
  updatedAt: string | null;
}

/** `PUT /stores/:slug/integrations/asaas/settings`, whole. */
export type AsaasSettingsPayload = Omit<AsaasSettings, "updatedAt">;
