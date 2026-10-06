// Libs
import { describe, expect, it } from "vitest"

// Types
import type { AsaasConnection, MelhorEnvioConnection } from "@harness-monorepo/contracts"

// App
import { integrationOptionsOf, integrationPagesOf, integrationRowsOf } from "./integration-pages"

const pages = integrationPagesOf("lessari")
const CONNECT = "/api/stores/lessari/integrations/melhor-envio/connect"

const melhorEnvio: MelhorEnvioConnection = { available: true, environment: "SANDBOX", status: "CONNECTED", account: { name: "Loja Lessari", email: null }, connectedAt: "2026-10-02T12:00:00.000Z", accessExpiresAt: "2026-11-01T12:00:00.000Z" }
const asaas: AsaasConnection = { available: true, environment: "PRODUCTION", status: "CONNECTED", account: { name: "Lessari Moda LTDA", document: "**.222.333/0001-**" }, webhook: "REGISTERED", connectedAt: "2026-10-05T12:00:00.000Z" }
const asaasNever: AsaasConnection = { ...asaas, status: "DISCONNECTED", account: null, webhook: null, connectedAt: null }

describe("integrationPagesOf", () => {
  it("builds every Integrations page of a shop, Asaas's among them", () => {
    expect(pages).toEqual({
      list: "/admin/lessari/integrations",
      new: "/admin/lessari/integrations/new",
      melhorEnvio: "/admin/lessari/integrations/melhor-envio",
      asaas: "/admin/lessari/integrations/asaas",
    })
    expect(integrationPagesOf("a b").asaas).toBe("/admin/a%20b/integrations/asaas")
  })
})

describe("integrationRowsOf", () => {
  it("lists what the shop connected, each with its account, its environment and its own page", () => {
    expect(integrationRowsOf({ melhorEnvio, asaas }, pages)).toEqual([
      { provider: "MELHOR_ENVIO", status: "CONNECTED", account: "Loja Lessari", sandbox: true, href: pages.melhorEnvio },
      { provider: "ASAAS", status: "CONNECTED", account: "Lessari Moda LTDA", sandbox: false, href: pages.asaas },
    ])
  })

  it("keeps one to mend on the list, and leaves out one never connected", () => {
    expect(integrationRowsOf({ melhorEnvio: { ...melhorEnvio, status: "DISCONNECTED", account: null }, asaas: { ...asaas, status: "NEEDS_RECONNECT", environment: "SANDBOX" } }, pages)).toEqual([
      { provider: "ASAAS", status: "NEEDS_RECONNECT", account: "Lessari Moda LTDA", sandbox: true, href: pages.asaas },
    ])
    expect(integrationRowsOf({ melhorEnvio: { ...melhorEnvio, status: "DISCONNECTED" }, asaas: asaasNever }, pages)).toEqual([])
  })

  /** A connection that was not read is not one the shop never made: it is simply absent here, and said elsewhere. */
  it("lists what was read when the other connection was not", () => {
    expect(integrationRowsOf({ asaas }, pages).map((row) => row.provider)).toEqual(["ASAAS"])
    expect(integrationRowsOf({ melhorEnvio }, pages).map((row) => row.provider)).toEqual(["MELHOR_ENVIO"])
    expect(integrationRowsOf({}, pages)).toEqual([])
  })
})

describe("integrationOptionsOf", () => {
  /**
   * Fetching Melhor Envio's way in begins an authorization there; Asaas's is its own page, where the
   * key is typed. The catalogue draws the first as a plain anchor and the second as the app's link.
   */
  it("offers each to connect by its own way in", () => {
    expect(integrationOptionsOf({ melhorEnvio: { ...melhorEnvio, status: "DISCONNECTED" }, asaas: asaasNever }, pages, CONNECT)).toEqual([
      { provider: "MELHOR_ENVIO", state: "available", connectHref: CONNECT, connectBy: "authorization", href: pages.melhorEnvio },
      { provider: "ASAAS", state: "available", connectHref: pages.asaas, connectBy: "page", href: pages.asaas },
    ])
  })

  it("says how far the shop is with each: connected, to mend, or not set up on this installation", () => {
    const states = (connections: Parameters<typeof integrationOptionsOf>[0]) => integrationOptionsOf(connections, pages, CONNECT).map((option) => option.state)

    expect(states({ melhorEnvio, asaas })).toEqual(["connected", "connected"])
    expect(states({ melhorEnvio: { ...melhorEnvio, status: "NEEDS_RECONNECT" }, asaas: { ...asaas, status: "NEEDS_RECONNECT" } })).toEqual(["connected", "connected"])
    expect(states({ melhorEnvio: { ...melhorEnvio, available: false }, asaas: { ...asaasNever, available: false } })).toEqual(["unavailable", "unavailable"])
  })

  it("offers what was read when the other connection was not", () => {
    expect(integrationOptionsOf({ asaas: asaasNever }, pages, CONNECT).map((option) => option.provider)).toEqual(["ASAAS"])
    expect(integrationOptionsOf({}, pages, CONNECT)).toEqual([])
  })
})
