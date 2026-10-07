// Types
import type { AsaasConnection, GoogleAnalyticsConnection, MelhorEnvioConnection, MetaPixelConnection } from "@harness-monorepo/contracts"
import type { IntegrationCardConnection, IntegrationCardView, IntegrationProviderValue, UpcomingIntegrationView } from "@harness-monorepo/ui/lib/integrations"

/**
 * The panel's Integrations as pages: the one that shows every third party there is, and each
 * integration's own. Every link to them is built here, so none points at a page that moved.
 */
export function integrationPagesOf(slug: string): { list: string; melhorEnvio: string; asaas: string; metaPixel: string; googleAnalytics: string } {
  const list = `/admin/${encodeURIComponent(slug)}/integrations`
  return { list, melhorEnvio: `${list}/melhor-envio`, asaas: `${list}/asaas`, metaPixel: `${list}/meta-pixel`, googleAnalytics: `${list}/google-analytics` }
}

/**
 * Each brand's own mark, as its site publishes it, under `public/brand/integrations/`: the square
 * one, since the name is always written beside it. The files are used as they came. Meta's is its
 * symbol alone, as an SVG file on a white square (BEELINK-270): served from here, never from Meta.
 * Google Analytics' is drawn the same way, in the brand's two oranges (BEELINK-302), and never
 * comes from Google.
 */
export const INTEGRATION_LOGOS: Record<IntegrationProviderValue, string> = {
  MELHOR_ENVIO: "/brand/integrations/melhor-envio-icon.png",
  ASAAS: "/brand/integrations/asaas-icon.png",
  META_PIXEL: "/brand/integrations/meta-icon.svg",
  GOOGLE_ANALYTICS: "/brand/integrations/google-analytics-icon.svg",
}

/**
 * What the page announces before it can be connected: BeeFlow, Beelink's own, which will put the
 * shop's WhatsApp to work. No API, route or page of it exists yet, so it is no card with a
 * connection — only its name and its mark, cut from the artwork to its yellow square.
 */
export const UPCOMING_INTEGRATIONS: readonly UpcomingIntegrationView[] = [{ product: "BEEFLOW", logoSrc: "/brand/integrations/beeflow.png" }]

/** A connection as its query has it: read, still being read, or a read that failed. */
export type ConnectionRead<T> = T | "loading" | "failed"

/**
 * A query's answer as a card takes it. What was read stands while it is read again, or after a later
 * read failed; a failed read being asked again is one being read, so "tentar de novo" is seen to try.
 */
export function connectionReadOf<T>(query: { data?: T; isError: boolean; isFetching?: boolean }): ConnectionRead<T> {
  return query.data ?? (query.isError && !query.isFetching ? "failed" : "loading")
}

/** `approval` is Asaas's alone (BEELINK-278): its account connects before Asaas approved it, and is charged nothing until then. */
type Connection = Pick<MelhorEnvioConnection, "available" | "status" | "environment"> & { account: { name: string } | null; approval?: AsaasConnection["approval"] }

function cardConnectionOf(read: ConnectionRead<Connection>): IntegrationCardView["connection"] {
  if (read === "loading" || read === "failed") return read
  const states = { DISCONNECTED: "disconnected", CONNECTED: "connected", NEEDS_RECONNECT: "needsReconnect" } satisfies Record<Connection["status"], IntegrationCardConnection["state"]>
  // Not known is not unapproved: only an account read as such loses the green.
  const unapproved = read.status === "CONNECTED" && read.approval != null && read.approval !== "APPROVED"
  return { state: !read.available ? "unavailable" : unapproved ? "unapproved" : states[read.status], account: read.account?.name ?? null, sandbox: read.environment === "SANDBOX" }
}

/**
 * The card of an integration that is an ID and nothing else — the Meta Pixel's, and Google
 * Analytics': an ID is saved or it is not. It has no account to name, no sandbox, and nothing a
 * deployment lacks or a third party stops accepting — nothing is asked of Meta or of Google.
 */
function idConnectionOf(read: ConnectionRead<Pick<MetaPixelConnection | GoogleAnalyticsConnection, "status">>): IntegrationCardView["connection"] {
  if (read === "loading" || read === "failed") return read
  return { state: read.status === "CONNECTED" ? "connected" : "disconnected", account: null, sandbox: false }
}

/**
 * The Integrations page's cards: every third party there is, whatever the shop did with it, in the
 * page's order. Melhor Envio's way in is the route that leaves for its authorization; Asaas's, the
 * Meta Pixel's and Google Analytics' are only their own pages, where the key or the ID is typed.
 */
export function integrationCardsOf(
  reads: { melhorEnvio: ConnectionRead<MelhorEnvioConnection>; asaas: ConnectionRead<AsaasConnection>; metaPixel: ConnectionRead<MetaPixelConnection>; googleAnalytics: ConnectionRead<GoogleAnalyticsConnection> },
  pages: { melhorEnvio: string; asaas: string; metaPixel: string; googleAnalytics: string },
  melhorEnvioConnectHref: string,
): IntegrationCardView[] {
  return [
    { provider: "MELHOR_ENVIO", logoSrc: INTEGRATION_LOGOS.MELHOR_ENVIO, href: pages.melhorEnvio, connectHref: melhorEnvioConnectHref, connectBy: "authorization", connection: cardConnectionOf(reads.melhorEnvio) },
    { provider: "ASAAS", logoSrc: INTEGRATION_LOGOS.ASAAS, href: pages.asaas, connectHref: pages.asaas, connectBy: "page", connection: cardConnectionOf(reads.asaas) },
    { provider: "META_PIXEL", logoSrc: INTEGRATION_LOGOS.META_PIXEL, href: pages.metaPixel, connectHref: pages.metaPixel, connectBy: "page", connection: idConnectionOf(reads.metaPixel) },
    { provider: "GOOGLE_ANALYTICS", logoSrc: INTEGRATION_LOGOS.GOOGLE_ANALYTICS, href: pages.googleAnalytics, connectHref: pages.googleAnalytics, connectBy: "page", connection: idConnectionOf(reads.googleAnalytics) },
  ]
}
