/**
 * The panel's Integrations as its blocks read them (BEELINK-183). They mirror the wire's shapes in
 * `packages/contracts/src/integration.ts`; this package does not import them, so a screen hands its
 * data over and the blocks never learn where it came from.
 */

/** Where the shop's Melhor Envio connection stands. Mirrors `IntegrationStatus`. */
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
}

/** What the form refuses, by field, in words. */
export type ShippingSettingsIssues = Partial<Record<"handlingDays" | "package", string>>

/** The services, grouped by carrier in the order they came: the form draws one list per carrier. */
export function servicesByCompany(services: readonly ShippingServiceView[]): { company: string; services: ShippingServiceView[] }[] {
  const groups = new Map<string, ShippingServiceView[]>()
  for (const service of services) groups.set(service.company, [...(groups.get(service.company) ?? []), service])
  return [...groups].map(([company, list]) => ({ company, services: list }))
}
