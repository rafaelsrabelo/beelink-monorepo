/**
 * A shop's connections to third parties that act in its name (docs/plans BEELINK-182): the Melhor
 * Envio account its labels are bought with and, later, the Asaas account it is paid into. Each is
 * the shopkeeper's own account; bee-link holds the access it was given, sealed, and never shows it.
 */

/** The third parties a shop can connect, one connection each. */
export type IntegrationProvider = "MELHOR_ENVIO" | "ASAAS";

/**
 * Where a shop's connection stands. `NEEDS_RECONNECT` is the third party refusing the access it gave
 * — revoked, or left unrenewed past its life — and only the shopkeeper authorizing again mends it.
 */
export type IntegrationStatus = "DISCONNECTED" | "CONNECTED" | "NEEDS_RECONNECT";

/** Which Melhor Envio this deployment talks to: the sandbox simulates labels, production buys them. */
export type MelhorEnvioEnvironment = "SANDBOX" | "PRODUCTION";

/** Whose Melhor Envio account the shop connected, as that account names itself. */
export interface MelhorEnvioAccount {
  name: string;
  email: string | null;
}

/** `GET /stores/:slug/integrations/melhor-envio`: the shop's connection, and whether one can be made here. */
export interface MelhorEnvioConnection {
  /** This deployment has a Melhor Envio app set up. Without one nothing below can change. */
  available: boolean;
  environment: MelhorEnvioEnvironment;
  status: IntegrationStatus;
  /** Null while disconnected. */
  account: MelhorEnvioAccount | null;
  /** ISO-8601; null while disconnected. */
  connectedAt: string | null;
  /** When the access in hand runs out, ISO-8601 — it is renewed before then. Null while disconnected. */
  accessExpiresAt: string | null;
}

/** `POST /stores/:slug/integrations/melhor-envio/authorize`: where to send the shopkeeper's browser. */
export interface IntegrationAuthorization {
  url: string;
}

/** `POST /integrations/melhor-envio/callback`: what the third party sent the browser back with. */
export interface MelhorEnvioCallbackPayload {
  code: string;
  state: string;
}

/** The callback's answer: the shop the flow began at — the state named it — and its connection now. */
export interface MelhorEnvioConnected {
  storeSlug: string;
  connection: MelhorEnvioConnection;
}

/**
 * - `INTEGRATION_UNAVAILABLE`: this deployment has no app set up for that third party.
 * - `INTEGRATION_STATE_INVALID`: the flow was not started here, by this person, for this shop; was
 *   used; or took too long.
 * - `INTEGRATION_EXCHANGE_FAILED`: the third party refused the code it had just sent.
 * - `INTEGRATION_UNREACHABLE`: the third party did not answer.
 * - `INTEGRATION_NOT_CONNECTED`, `INTEGRATION_NEEDS_RECONNECT`: an action needs the shop's account, and
 *   there is none, or the third party stopped accepting it.
 */
export type IntegrationErrorCode =
  | "INTEGRATION_UNAVAILABLE"
  | "INTEGRATION_STATE_INVALID"
  | "INTEGRATION_EXCHANGE_FAILED"
  | "INTEGRATION_UNREACHABLE"
  | "INTEGRATION_NOT_CONNECTED"
  | "INTEGRATION_NEEDS_RECONNECT";

/** The `details` of an integration refusal raised after the state named the shop: where to send the browser back. */
export interface IntegrationRefusalDetails {
  storeSlug: string;
}
