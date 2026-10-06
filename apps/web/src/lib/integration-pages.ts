// Types
import type { AsaasConnection, MelhorEnvioConnection } from "@harness-monorepo/contracts"
import type { IntegrationOptionView, IntegrationRowView } from "@harness-monorepo/ui/lib/integrations"

/**
 * The panel's Integrations as pages: the list of what the shop connected, the page that adds one, and
 * each integration's own. Every link to them is built here, so none points at a page that moved.
 */
export function integrationPagesOf(slug: string): { list: string; new: string; melhorEnvio: string; asaas: string } {
  const list = `/admin/${encodeURIComponent(slug)}/integrations`
  return { list, new: `${list}/new`, melhorEnvio: `${list}/melhor-envio`, asaas: `${list}/asaas` }
}

/** The shop's connections as far as they were read: one still being read, or whose read failed, is absent. */
export interface IntegrationConnections {
  melhorEnvio?: MelhorEnvioConnection
  asaas?: AsaasConnection
}

/** The list's rows: a connection the shop made, working or to mend. One it never made, or undid, is not on it. */
export function integrationRowsOf({ melhorEnvio, asaas }: IntegrationConnections, pages: { melhorEnvio: string; asaas: string }): IntegrationRowView[] {
  const rows: IntegrationRowView[] = []
  if (melhorEnvio && melhorEnvio.status !== "DISCONNECTED") {
    rows.push({ provider: "MELHOR_ENVIO", status: melhorEnvio.status, account: melhorEnvio.account?.name ?? null, sandbox: melhorEnvio.environment === "SANDBOX", href: pages.melhorEnvio })
  }
  if (asaas && asaas.status !== "DISCONNECTED") {
    rows.push({ provider: "ASAAS", status: asaas.status, account: asaas.account?.name ?? null, sandbox: asaas.environment === "SANDBOX", href: pages.asaas })
  }
  return rows
}

const stateOf = (connection: { available: boolean; status: string }) => (!connection.available ? "unavailable" : connection.status === "DISCONNECTED" ? "available" : "connected")

/**
 * What there is to connect, and how far the shop is with each. Melhor Envio's way in is the route
 * that leaves for its authorization; Asaas's is only its own page, where the key is typed.
 */
export function integrationOptionsOf({ melhorEnvio, asaas }: IntegrationConnections, pages: { melhorEnvio: string; asaas: string }, melhorEnvioConnectHref: string): IntegrationOptionView[] {
  const options: IntegrationOptionView[] = []
  if (melhorEnvio) options.push({ provider: "MELHOR_ENVIO", state: stateOf(melhorEnvio), connectHref: melhorEnvioConnectHref, connectBy: "authorization", href: pages.melhorEnvio })
  if (asaas) options.push({ provider: "ASAAS", state: stateOf(asaas), connectHref: pages.asaas, connectBy: "page", href: pages.asaas })
  return options
}
