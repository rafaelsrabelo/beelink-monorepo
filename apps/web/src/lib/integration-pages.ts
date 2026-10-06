// Types
import type { AsaasConnection, MelhorEnvioConnection } from "@harness-monorepo/contracts"
import type { IntegrationCardConnection, IntegrationCardView, IntegrationProviderValue, UpcomingIntegrationView } from "@harness-monorepo/ui/lib/integrations"

/**
 * The panel's Integrations as pages: the one that shows every third party there is, and each
 * integration's own. Every link to them is built here, so none points at a page that moved.
 */
export function integrationPagesOf(slug: string): { list: string; melhorEnvio: string; asaas: string } {
  const list = `/admin/${encodeURIComponent(slug)}/integrations`
  return { list, melhorEnvio: `${list}/melhor-envio`, asaas: `${list}/asaas` }
}

/**
 * Each brand's own mark, as its site publishes it, under `public/brand/integrations/`: the square
 * one, since the name is always written beside it. The files are used as they came.
 */
export const INTEGRATION_LOGOS: Record<IntegrationProviderValue, string> = {
  MELHOR_ENVIO: "/brand/integrations/melhor-envio-icon.png",
  ASAAS: "/brand/integrations/asaas-icon.png",
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

type Connection = Pick<MelhorEnvioConnection, "available" | "status" | "environment"> & { account: { name: string } | null }

function cardConnectionOf(read: ConnectionRead<Connection>): IntegrationCardView["connection"] {
  if (read === "loading" || read === "failed") return read
  const states = { DISCONNECTED: "disconnected", CONNECTED: "connected", NEEDS_RECONNECT: "needsReconnect" } satisfies Record<Connection["status"], IntegrationCardConnection["state"]>
  return { state: read.available ? states[read.status] : "unavailable", account: read.account?.name ?? null, sandbox: read.environment === "SANDBOX" }
}

/**
 * The Integrations page's cards: every third party there is, whatever the shop did with it, in the
 * page's order. Melhor Envio's way in is the route that leaves for its authorization; Asaas's is only
 * its own page, where the key is typed.
 */
export function integrationCardsOf(
  reads: { melhorEnvio: ConnectionRead<MelhorEnvioConnection>; asaas: ConnectionRead<AsaasConnection> },
  pages: { melhorEnvio: string; asaas: string },
  melhorEnvioConnectHref: string,
): IntegrationCardView[] {
  return [
    { provider: "MELHOR_ENVIO", logoSrc: INTEGRATION_LOGOS.MELHOR_ENVIO, href: pages.melhorEnvio, connectHref: melhorEnvioConnectHref, connectBy: "authorization", connection: cardConnectionOf(reads.melhorEnvio) },
    { provider: "ASAAS", logoSrc: INTEGRATION_LOGOS.ASAAS, href: pages.asaas, connectHref: pages.asaas, connectBy: "page", connection: cardConnectionOf(reads.asaas) },
  ]
}
