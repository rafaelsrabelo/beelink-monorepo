// Types
import type { MelhorEnvioConnection } from "@harness-monorepo/contracts"
import type { IntegrationOptionView, IntegrationRowView } from "@harness-monorepo/ui/lib/integrations"

/**
 * The panel's Integrations as pages: the list of what the shop connected, the page that adds one, and
 * each integration's own. Every link to them is built here, so none points at a page that moved.
 */
export function integrationPagesOf(slug: string): { list: string; new: string; melhorEnvio: string } {
  const list = `/admin/${encodeURIComponent(slug)}/integrations`
  return { list, new: `${list}/new`, melhorEnvio: `${list}/melhor-envio` }
}

/** The list's rows: a connection the shop made, working or to mend. One it never made, or undid, is not on it. */
export function integrationRowsOf(connection: MelhorEnvioConnection, pages: { melhorEnvio: string }): IntegrationRowView[] {
  if (connection.status === "DISCONNECTED") return []
  return [{ provider: "MELHOR_ENVIO", status: connection.status, account: connection.account?.name ?? null, sandbox: connection.environment === "SANDBOX", href: pages.melhorEnvio }]
}

/** What there is to connect, and how far the shop is with each. */
export function integrationOptionsOf(connection: MelhorEnvioConnection, pages: { melhorEnvio: string }, connectHref: string): IntegrationOptionView[] {
  const state = !connection.available ? "unavailable" : connection.status === "DISCONNECTED" ? "available" : "connected"
  return [{ provider: "MELHOR_ENVIO", state, connectHref, href: pages.melhorEnvio }]
}
