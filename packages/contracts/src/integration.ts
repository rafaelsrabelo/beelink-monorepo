/**
 * A shop's connections to third parties that act in its name (docs/plans BEELINK-182): the Melhor
 * Envio account its labels are bought with and, later, the Asaas account it is paid into. Each is
 * the shopkeeper's own account; bee-link holds the access it was given, sealed, and never shows it.
 */

/**
 * The third parties a shop can connect, one connection each. `META_PIXEL` (BEELINK-269) is the odd
 * one: what the shop gives is its pixel's ID, which is public — nothing of it is sealed.
 */
export type IntegrationProvider = "MELHOR_ENVIO" | "ASAAS" | "META_PIXEL";

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
  | "INTEGRATION_NEEDS_RECONNECT"
  /** A webhook whose signature is missing or not the app's (BEELINK-188). */
  | "INTEGRATION_SIGNATURE_INVALID"
  /** A carrier setting out of range: days past 30, a service id repeated, half a package, a document that is no CPF or CNPJ. */
  | "MELHOR_ENVIO_SETTINGS_INVALID"
  /** An API key the third party refused, or one no key could be: missing, blank, with spaces (BEELINK-202). */
  | "INTEGRATION_KEY_INVALID"
  /** An API key from the other environment: a sandbox key on production, or the reverse (BEELINK-202). */
  | "INTEGRATION_KEY_WRONG_ENVIRONMENT"
  /** A way of being paid out of range: instalments that are no whole number from 1 to 12, a switch that is no boolean, or every way off (BEELINK-203). */
  | "ASAAS_SETTINGS_INVALID"
  /** A Meta Pixel ID that is not 10 to 20 digits and nothing else: missing, with a letter, a whole snippet pasted (BEELINK-269). */
  | "META_PIXEL_ID_INVALID"
  /** A Conversions API token no token could be: blank, with spaces, too short or too long (BEELINK-274). */
  | "META_PIXEL_TOKEN_INVALID"
  /** A test event code no code could be (BEELINK-274). */
  | "META_PIXEL_TEST_CODE_INVALID";

/** The `details` of an integration refusal raised after the state named the shop: where to send the browser back. */
export interface IntegrationRefusalDetails {
  storeSlug: string;
}

/** A carrier's service the shop can offer: PAC, SEDEX, .Package… — by Melhor Envio's own id. */
export interface MelhorEnvioShippingService {
  id: number;
  name: string;
  /** The carrier, by name: Correios, Jadlog… */
  company: string;
}

/** `GET /stores/:slug/integrations/melhor-envio/account`: read from Melhor Envio there and then, never kept. */
export interface MelhorEnvioAccountOverview {
  /** What the shop's wallet holds now, in cents. Labels are paid from it. */
  balanceCents: number;
  /** Every service Melhor Envio offers, by carrier then name. */
  services: MelhorEnvioShippingService[];
}

/** A parcel's weight and size, in the product's own units: grams and millimetres. */
export interface ShippingPackage {
  weightGrams: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
}

/** `GET /stores/:slug/integrations/melhor-envio/settings`: how the shop ships by carrier. */
export interface MelhorEnvioSettings {
  /** How many days the shop takes to post an order, added to the carrier's time. */
  handlingDays: number;
  /** The services offered at checkout; null until first saved, and then every service is. */
  serviceIds: number[] | null;
  /** Used for a product with no size of its own; null with none. */
  defaultPackage: ShippingPackage | null;
  /** Who sends the labels (BEELINK-187): the shop's CPF (11 digits) or CNPJ (14). Null until told — no label is bought without it. */
  senderDocument: string | null;
  /** The shop's state registration, for a commercial shipment with an invoice; null with none. */
  senderStateRegister: string | null;
  /** ISO-8601; null until first saved. */
  updatedAt: string | null;
}

/** `PUT /stores/:slug/integrations/melhor-envio/settings`, whole. */
export interface MelhorEnvioSettingsPayload {
  handlingDays: number;
  serviceIds: number[];
  defaultPackage: ShippingPackage | null;
  /** Digits, with or without the mask; a CPF or a CNPJ whose check digits hold. Absent keeps what is saved. */
  senderDocument?: string | null;
  senderStateRegister?: string | null;
}
