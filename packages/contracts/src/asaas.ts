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

/** Whose Asaas account the shop connected, as that account names itself. */
export interface AsaasAccount {
  name: string;
  /** The account's CPF or CNPJ, masked — `***.456.789-**`, `**.345.678/0001-**`; never whole. Null when Asaas sent none. */
  document: string | null;
}

/** `GET /stores/:slug/integrations/asaas`: the shop's connection. Never carries the key. */
export interface AsaasConnection {
  /** This deployment can seal a key. Without it nothing below can change. */
  available: boolean;
  environment: AsaasEnvironment;
  status: IntegrationStatus;
  /** Null while disconnected. */
  account: AsaasAccount | null;
  /** Null while disconnected. */
  webhook: IntegrationWebhookState | null;
  /** ISO-8601; null while disconnected. */
  connectedAt: string | null;
}

/** `POST /stores/:slug/integrations/asaas`: connect, or replace the key connected before. */
export interface AsaasConnectPayload {
  /** As Asaas shows it, `$` included: `$aact_prod_…` in production, `$aact_hmlg_…` in the sandbox. */
  apiKey: string;
}
