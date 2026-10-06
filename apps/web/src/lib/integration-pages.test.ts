// Libs
import { describe, expect, it } from "vitest"

// Types
import type { AsaasConnection, MelhorEnvioConnection } from "@harness-monorepo/contracts"

// App
import { INTEGRATION_LOGOS, connectionReadOf, integrationCardsOf, integrationPagesOf } from "./integration-pages"

const pages = integrationPagesOf("lessari")
const CONNECT = "/api/stores/lessari/integrations/melhor-envio/connect"

const melhorEnvio: MelhorEnvioConnection = { available: true, environment: "SANDBOX", status: "CONNECTED", account: { name: "Loja Lessari", email: null }, connectedAt: "2026-10-02T12:00:00.000Z", accessExpiresAt: "2026-11-01T12:00:00.000Z" }
const asaas: AsaasConnection = { available: true, environment: "PRODUCTION", status: "CONNECTED", account: { name: "Lessari Moda LTDA", document: "**.222.333/0001-**" }, webhook: "REGISTERED", connectedAt: "2026-10-05T12:00:00.000Z" }
const asaasNever: AsaasConnection = { ...asaas, status: "DISCONNECTED", account: null, webhook: null, connectedAt: null }

const connectionsOf = (reads: Parameters<typeof integrationCardsOf>[0]) => integrationCardsOf(reads, pages, CONNECT).map((card) => card.connection)

describe("integrationPagesOf", () => {
  it("builds every Integrations page of a shop: the list and each integration's own", () => {
    expect(pages).toEqual({
      list: "/admin/lessari/integrations",
      melhorEnvio: "/admin/lessari/integrations/melhor-envio",
      asaas: "/admin/lessari/integrations/asaas",
    })
    expect(integrationPagesOf("a b").asaas).toBe("/admin/a%20b/integrations/asaas")
  })
})

describe("connectionReadOf", () => {
  it("is what was read, a read still to come, or one that failed", () => {
    expect(connectionReadOf({ data: asaas, isError: false })).toBe(asaas)
    expect(connectionReadOf<AsaasConnection>({ isError: false })).toBe("loading")
    expect(connectionReadOf<AsaasConnection>({ isError: true, isFetching: false })).toBe("failed")
  })

  it("keeps what was read when a later read fails, and is reading again while a failed read is retried", () => {
    expect(connectionReadOf({ data: asaas, isError: true })).toBe(asaas)
    expect(connectionReadOf<AsaasConnection>({ isError: true, isFetching: true })).toBe("loading")
  })
})

describe("integrationCardsOf", () => {
  /**
   * Fetching Melhor Envio's way in begins an authorization there; Asaas's is its own page, where the
   * key is typed. The card draws the first as a plain anchor and the second as the app's link.
   */
  it("is every third party there is, connected or not, each with its mark, its page and its own way in", () => {
    expect(integrationCardsOf({ melhorEnvio, asaas: asaasNever }, pages, CONNECT)).toEqual([
      { provider: "MELHOR_ENVIO", logoSrc: INTEGRATION_LOGOS.MELHOR_ENVIO, href: pages.melhorEnvio, connectHref: CONNECT, connectBy: "authorization", connection: { state: "connected", account: "Loja Lessari", sandbox: true } },
      { provider: "ASAAS", logoSrc: INTEGRATION_LOGOS.ASAAS, href: pages.asaas, connectHref: pages.asaas, connectBy: "page", connection: { state: "disconnected", account: null, sandbox: false } },
    ])
  })

  it("serves each mark from the app's own files", () => {
    expect(INTEGRATION_LOGOS).toEqual({ MELHOR_ENVIO: "/brand/integrations/melhor-envio-icon.png", ASAAS: "/brand/integrations/asaas-icon.png" })
  })

  it("says how far the shop is with each: to mend, or not set up on this installation whatever its status", () => {
    expect(connectionsOf({ melhorEnvio: { ...melhorEnvio, status: "NEEDS_RECONNECT" }, asaas: { ...asaas, status: "NEEDS_RECONNECT" } }).map((connection) => (typeof connection === "object" ? connection.state : connection))).toEqual(["needsReconnect", "needsReconnect"])
    expect(connectionsOf({ melhorEnvio: { ...melhorEnvio, available: false }, asaas: { ...asaasNever, available: false } }).map((connection) => (typeof connection === "object" ? connection.state : connection))).toEqual(["unavailable", "unavailable"])
  })

  /** A connection that was not read is not one the shop never made: its card stays, saying so. */
  it("keeps the card of a connection still being read, or whose read failed, beside the one that was read", () => {
    expect(connectionsOf({ melhorEnvio: "loading", asaas })).toEqual(["loading", { state: "connected", account: "Lessari Moda LTDA", sandbox: false }])
    expect(connectionsOf({ melhorEnvio: "failed", asaas: "loading" })).toEqual(["failed", "loading"])
  })
})
