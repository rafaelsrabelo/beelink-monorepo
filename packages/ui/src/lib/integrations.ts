/**
 * The panel's Integrations as its blocks read them (BEELINK-183). They mirror the wire's shapes in
 * `packages/contracts/src/integration.ts` and `asaas.ts`; this package does not import them, so a
 * screen hands its data over and the blocks never learn where it came from.
 */

/** Where a shop's connection to a third party stands. Mirrors `IntegrationStatus`. */
export type IntegrationStatusValue = "DISCONNECTED" | "CONNECTED" | "NEEDS_RECONNECT"

/** The wallet, as the card says it: read, still being read, or not readable now — never a zero in its place. */
export type WalletView = { state: "loading" } | { state: "failed" } | { state: "ready"; balance: string }

/** The Melhor Envio card, already in words where it says amounts. */
export interface MelhorEnvioCardView {
  /** This deployment has an app set up; without one there is nothing to connect. */
  available: boolean
  status: IntegrationStatusValue
  /** The sandbox simulates labels: said, so nobody sells thinking they are real. */
  sandbox: boolean
  account: { name: string; email: string | null } | null
  wallet: WalletView
}

/** Where the webhook bee-link registered at a shop's own account stands. Mirrors `IntegrationWebhookState`. */
export type IntegrationWebhookStateValue = "REGISTERED" | "SKIPPED" | "PAUSED" | "ERROR"

/** Whether Asaas approved the shop's account. Mirrors `AsaasAccountApproval`. */
export type AsaasApprovalValue = "PENDING" | "AWAITING_APPROVAL" | "APPROVED" | "REJECTED"

/** An account Asaas charges nothing of: every standing but approved. */
export type AsaasUnapprovedValue = Exclude<AsaasApprovalValue, "APPROVED">

/** The Asaas card. Mirrors `AsaasConnection`, with the address the screen worked out for its environment. */
export interface AsaasCardView {
  /** This deployment can seal a key; without that there is nothing to connect. */
  available: boolean
  status: IntegrationStatusValue
  /** The sandbox charges nobody: said, so nobody takes a test payment for money. */
  sandbox: boolean
  /** The document is already masked; null when Asaas gave none. */
  account: { name: string; document: string | null } | null
  /** Null while disconnected. */
  webhook: IntegrationWebhookStateValue | null
  /** Null while disconnected or not known, which is drawn as approved: only an account read as not approved is said to be so. */
  approval: AsaasApprovalValue | null
  /** Which connection this is: it changes with every key connected. Null while disconnected. */
  connectedAt: string | null
  /** Where an Asaas account is opened, for a shopkeeper who has none: the sandbox's own site, or Asaas's. */
  signUpHref: string
}

/** As far as a shop's choice of instalments goes: the API's own bound, the one every card brand takes at Asaas. */
export const PAYMENT_INSTALLMENTS_MAX = 12

/** How the shop is paid, as the form edits it: switches and a number, nothing typed. Mirrors `AsaasSettingsPayload`. */
export interface PaymentSettingsFormValues {
  pix: boolean
  card: boolean
  /** 1 to `PAYMENT_INSTALLMENTS_MAX`; 1 is in full. Kept while `card` is off. */
  maxInstallments: number
  /** Paying on delivery or at pickup, settled between the shop and the customer. */
  offline: boolean
}

/** The third parties the panel can offer, by the wire's name. Mirrors `IntegrationProvider`. */
export type IntegrationProviderValue = "MELHOR_ENVIO" | "ASAAS"

/** Where a card's connection stands once it was read. */
export interface IntegrationCardConnection {
  /**
   * Not set up on this deployment; there to connect; working; one the third party stopped accepting;
   * or one whose account the third party has not approved, which stands and does nothing yet.
   */
  state: "unavailable" | "disconnected" | "connected" | "needsReconnect" | "unapproved"
  /** Whose account on the other side, as it names itself. */
  account: string | null
  /** The sandbox simulates what it does: said on the list too. */
  sandbox: boolean
}

/** A third party on the Integrations page, as its card shows it: connected or not, it is always there. */
export interface IntegrationCardView {
  provider: IntegrationProviderValue
  /** The brand's own mark, as a file the app serves: this package reads no `public/`. */
  logoSrc: string
  /** The integration's own page. */
  href: string
  /** Where connecting, or connecting again, begins. */
  connectHref: string
  /**
   * What following `connectHref` does. `authorization`: fetching the address already begins the third
   * party's authorization, so it is a plain anchor and never prefetched. `page`: it is the
   * integration's own page, where the shop's key is typed, and goes through the app's link.
   */
  connectBy: "authorization" | "page"
  /** Still being read, a read that failed, or where it stands. Each card's own: one never waits on another. */
  connection: "loading" | "failed" | IntegrationCardConnection
}

/** What is announced on the Integrations page before it can be connected. No provider of the wire's: nothing is read of it. */
export type UpcomingIntegrationValue = "BEEFLOW"

/** Something on its way, as its card shows it: who it is and its mark. It has no connection, no page and no way in. */
export interface UpcomingIntegrationView {
  product: UpcomingIntegrationValue
  /** Its own mark, as a file the app serves. */
  logoSrc: string
}

/** A carrier's service, to switch on or off. Mirrors `MelhorEnvioShippingService`. */
export interface ShippingServiceView {
  id: number
  name: string
  company: string
}

/** The carrier settings as the form edits them: the numbers as typed, before they are read. */
export interface ShippingSettingsFormValues {
  serviceIds: number[]
  handlingDays: string
  /** Grams. */
  weight: string
  /** Centimetres, as the product's own form takes them. */
  length: string
  width: string
  height: string
  /** Who sends the labels (BEELINK-187): the shop's CPF or CNPJ, as typed. */
  senderDocument: string
  /** The shop's state registration, as typed; empty is none. */
  senderStateRegister: string
}

/** What the form refuses, by field, in words. */
export type ShippingSettingsIssues = Partial<Record<"handlingDays" | "package" | "senderDocument", string>>

/** The services, grouped by carrier in the order they came: the form draws one list per carrier. */
export function servicesByCompany(services: readonly ShippingServiceView[]): { company: string; services: ShippingServiceView[] }[] {
  const groups = new Map<string, ShippingServiceView[]>()
  for (const service of services) groups.set(service.company, [...(groups.get(service.company) ?? []), service])
  return [...groups].map(([company, list]) => ({ company, services: list }))
}
