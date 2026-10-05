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

/** The third parties the panel can offer, by the wire's name. Mirrors `IntegrationProvider`. */
export type IntegrationProviderValue = "MELHOR_ENVIO" | "ASAAS"

/** A connection the shop has, as the Integrations list shows it: one it made, working or to mend. */
export interface IntegrationRowView {
  provider: IntegrationProviderValue
  status: "CONNECTED" | "NEEDS_RECONNECT"
  /** Whose account on the other side, as it names itself. */
  account: string | null
  /** The sandbox simulates what it does: said on the list too. */
  sandbox: boolean
  /** The integration's own page. */
  href: string
}

/** A third party the shop can connect, as the new integration's page offers it. */
export interface IntegrationOptionView {
  provider: IntegrationProviderValue
  /** Not set up on this deployment; there to connect; or connected already, and then its page is the way on. */
  state: "unavailable" | "available" | "connected"
  /** Where connecting begins. */
  connectHref: string
  /**
   * What following `connectHref` does. `authorization`: fetching the address already begins the third
   * party's authorization, so it is a plain anchor and never prefetched. `page`: it is the
   * integration's own page, where the shop's key is typed, and goes through the app's link.
   */
  connectBy: "authorization" | "page"
  /** The integration's own page. */
  href: string
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
