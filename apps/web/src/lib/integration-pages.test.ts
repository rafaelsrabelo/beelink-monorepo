// Libs
import { describe, expect, it } from "vitest"

// Types
import type { AsaasConnection, MelhorEnvioConnection, MetaPixelConnection } from "@harness-monorepo/contracts"

// App
import { INTEGRATION_LOGOS, connectionReadOf, integrationCardsOf, integrationPagesOf } from "./integration-pages"

const pages = integrationPagesOf("lessari")
const CONNECT = "/api/stores/lessari/integrations/melhor-envio/connect"

const melhorEnvio: MelhorEnvioConnection = { available: true, environment: "SANDBOX", status: "CONNECTED", account: { name: "Loja Lessari", email: null }, connectedAt: "2026-10-02T12:00:00.000Z", accessExpiresAt: "2026-11-01T12:00:00.000Z" }
const asaas: AsaasConnection = { available: true, environment: "PRODUCTION", status: "CONNECTED", account: { name: "Lessari Moda LTDA", document: "**.222.333/0001-**" }, webhook: "REGISTERED", approval: "APPROVED", approvalCheckedAt: "2026-10-05T12:00:00.000Z", connectedAt: "2026-10-05T12:00:00.000Z" }
const asaasNever: AsaasConnection = { ...asaas, status: "DISCONNECTED", account: null, webhook: null, approval: null, approvalCheckedAt: null, connectedAt: null }

const pixelNever: MetaPixelConnection = { status: "DISCONNECTED", pixelId: null, connectedAt: null }
const pixel: MetaPixelConnection = { status: "CONNECTED", pixelId: "123456789012345", connectedAt: "2026-10-06T12:00:00.000Z" }

type Reads = Parameters<typeof integrationCardsOf>[0]
/** The cards' connections, in the page's order. A shop's pixel is not given unless a test is about it. */
const connectionsOf = (reads: Omit<Reads, "metaPixel"> & Partial<Pick<Reads, "metaPixel">>) => integrationCardsOf({ metaPixel: pixelNever, ...reads }, pages, CONNECT).map((card) => card.connection)
const PIXEL_NEVER = { state: "disconnected", account: null, sandbox: false }

describe("integrationPagesOf", () => {
  it("builds every Integrations page of a shop: the list and each integration's own", () => {
    expect(pages).toEqual({
      list: "/admin/lessari/integrations",
      melhorEnvio: "/admin/lessari/integrations/melhor-envio",
      asaas: "/admin/lessari/integrations/asaas",
      metaPixel: "/admin/lessari/integrations/meta-pixel",
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
   * Fetching Melhor Envio's way in begins an authorization there; Asaas's and the Meta Pixel's are
   * their own pages, where the key or the ID is typed. The card draws the first as a plain anchor and
   * the others as the app's link.
   */
  it("is every third party there is, connected or not, each with its mark, its page and its own way in", () => {
    expect(integrationCardsOf({ melhorEnvio, asaas: asaasNever, metaPixel: pixelNever }, pages, CONNECT)).toEqual([
      { provider: "MELHOR_ENVIO", logoSrc: INTEGRATION_LOGOS.MELHOR_ENVIO, href: pages.melhorEnvio, connectHref: CONNECT, connectBy: "authorization", connection: { state: "connected", account: "Loja Lessari", sandbox: true } },
      { provider: "ASAAS", logoSrc: INTEGRATION_LOGOS.ASAAS, href: pages.asaas, connectHref: pages.asaas, connectBy: "page", connection: { state: "disconnected", account: null, sandbox: false } },
      { provider: "META_PIXEL", logoSrc: INTEGRATION_LOGOS.META_PIXEL, href: pages.metaPixel, connectHref: pages.metaPixel, connectBy: "page", connection: { state: "disconnected", account: null, sandbox: false } },
    ])
  })

  it("serves each mark from the app's own files", () => {
    expect(INTEGRATION_LOGOS).toEqual({ MELHOR_ENVIO: "/brand/integrations/melhor-envio-icon.png", ASAAS: "/brand/integrations/asaas-icon.png", META_PIXEL: "/brand/integrations/meta-icon.svg" })
    // A mark that came from another site would tell that site of every shopkeeper who opened the page.
    for (const logo of Object.values(INTEGRATION_LOGOS)) expect(logo).toMatch(/^\/brand\/integrations\//)
  })

  it("says how far the shop is with each: to mend, or not set up on this installation whatever its status", () => {
    expect(connectionsOf({ melhorEnvio: { ...melhorEnvio, status: "NEEDS_RECONNECT" }, asaas: { ...asaas, status: "NEEDS_RECONNECT" } }).map((connection) => (typeof connection === "object" ? connection.state : connection))).toEqual(["needsReconnect", "needsReconnect", "disconnected"])
    expect(connectionsOf({ melhorEnvio: { ...melhorEnvio, available: false }, asaas: { ...asaasNever, available: false } }).map((connection) => (typeof connection === "object" ? connection.state : connection))).toEqual(["unavailable", "unavailable", "disconnected"])
  })

  /** A connection that was not read is not one the shop never made: its card stays, saying so. */
  it("keeps the card of a connection still being read, or whose read failed, beside the one that was read", () => {
    expect(connectionsOf({ melhorEnvio: "loading", asaas })).toEqual(["loading", { state: "connected", account: "Lessari Moda LTDA", sandbox: false }, PIXEL_NEVER])
    expect(connectionsOf({ melhorEnvio: "failed", asaas: "loading", metaPixel: "failed" })).toEqual(["failed", "loading", "failed"])
    expect(connectionsOf({ melhorEnvio, asaas, metaPixel: "loading" })[2]).toBe("loading")
  })
})

describe("integrationCardsOf, of an Asaas account not approved (BEELINK-278)", () => {
  const asaasCard = (read: AsaasConnection) => connectionsOf({ melhorEnvio, asaas: read })[1]

  it("is never a connected card: nothing is charged of it, whichever way it stands", () => {
    for (const approval of ["PENDING", "AWAITING_APPROVAL", "REJECTED"] as const) expect(asaasCard({ ...asaas, approval })).toEqual({ state: "unapproved", account: "Lessari Moda LTDA", sandbox: false })
  })

  it("is connected when approved, and when the approval is not known", () => {
    expect(asaasCard(asaas)).toMatchObject({ state: "connected" })
    expect(asaasCard({ ...asaas, approval: null, approvalCheckedAt: null })).toMatchObject({ state: "connected" })
  })

  it("says a key to be reconnected, and a deployment that cannot connect, before anything of the approval", () => {
    expect(asaasCard({ ...asaas, status: "NEEDS_RECONNECT", approval: "REJECTED" })).toMatchObject({ state: "needsReconnect" })
    expect(asaasCard({ ...asaas, available: false, approval: "REJECTED" })).toMatchObject({ state: "unavailable" })
  })
})

describe("integrationCardsOf, of the shop's Meta Pixel (BEELINK-270)", () => {
  const pixelCard = (read: MetaPixelConnection) => connectionsOf({ melhorEnvio, asaas, metaPixel: read })[2]

  it("is connected while an ID is saved, and has no account and no sandbox to name", () => {
    expect(pixelCard(pixel)).toEqual({ state: "connected", account: null, sandbox: false })
    expect(pixelCard(pixelNever)).toEqual({ state: "disconnected", account: null, sandbox: false })
  })

  /** Nothing is asked of Meta, so nothing of Meta's can go stale: the only thing to do is give an ID. */
  it("is never one to mend, whatever status the wire could carry", () => {
    expect(pixelCard({ ...pixelNever, status: "NEEDS_RECONNECT" })).toMatchObject({ state: "disconnected" })
  })
})
