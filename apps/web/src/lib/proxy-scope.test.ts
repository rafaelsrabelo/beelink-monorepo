// Libs
import { describe, expect, it } from "vitest"

// App
import { isFilePath, isPanelPath, shopPageOf, wasHandedOver } from "./proxy-scope"

const holding = (...cookies: string[]) => (cookie: string) => cookies.includes(cookie)

/**
 * The list that was the proxy's matcher, entry by entry. `src/proxy.test.ts` asks the same of it
 * through the proxy; here each entry is read on its own, with the edges a matcher's pattern had.
 */
describe("what the proxy takes in hand on the platform's host", () => {
  it("the panel's pages with everything under them, with or without a cookie", () => {
    for (const path of ["/dashboard", "/dashboard/settings", "/admin", "/admin/loja", "/admin/loja/orders/14"]) expect(wasHandedOver(path, holding()), path).toBe(true)
    // A path that only starts the same is somebody's shop.
    for (const path of ["/dashboards", "/administrador", "/admin-loja"]) expect(wasHandedOver(path, holding()), path).toBe(false)
  })

  it("/create-store and the auth screens, each alone: nothing under them was ever named", () => {
    for (const path of ["/create-store", "/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"]) {
      expect(wasHandedOver(path, holding()), path).toBe(true)
      expect(wasHandedOver(`${path}/x`, holding()), `${path}/x`).toBe(false)
    }
  })

  it("the panel's handlers, only with a panel refresh cookie, and never the four groups that write their own", () => {
    expect(wasHandedOver("/api/stores", holding("bl_refresh"))).toBe(true)
    expect(wasHandedOver("/api/stores/loja/orders", holding("bl_refresh", "bl_access"))).toBe(true)
    expect(wasHandedOver("/api/stores/loja/orders", holding("bl_access"))).toBe(false)
    expect(wasHandedOver("/api", holding("bl_refresh"))).toBe(false)
    for (const group of ["session", "auth", "customer", "storefront"]) {
      expect(wasHandedOver(`/api/${group}`, holding("bl_refresh")), group).toBe(false)
      expect(wasHandedOver(`/api/${group}/x/y`, holding("bl_refresh")), group).toBe(false)
    }
    // Only those four names whole: a group that starts like one is the panel's.
    expect(wasHandedOver("/api/sessions", holding("bl_refresh"))).toBe(true)
  })

  it("a shop's pages and handlers, only for a shopper with a refresh cookie and no access cookie", () => {
    for (const path of ["/loja", "/loja/produtos/bolsa", "/loja/api/customer/perfil", "/loja/foto.png"]) {
      expect(wasHandedOver(path, holding("bl_shopper_refresh")), path).toBe(true)
      expect(wasHandedOver(path, holding("bl_shopper_refresh", "bl_shopper_access")), path).toBe(false)
      expect(wasHandedOver(path, holding()), path).toBe(false)
      expect(wasHandedOver(path, holding("bl_refresh", "bl_access")), path).toBe(false)
    }
  })

  it("never the root, a first segment with a dot, or one that starts with _next or api", () => {
    for (const path of ["/", "/favicon.ico", "/robots.txt", "/_next/static/a.js", "/_nextish", "/api", "/apiario", "/apiario/produtos"]) {
      expect(wasHandedOver(path, holding("bl_shopper_refresh")), path).toBe(false)
    }
  })
})

describe("the panel's own paths", () => {
  it("are the panel's pages and the auth screens, with what is under them", () => {
    for (const path of ["/admin", "/admin/loja", "/dashboard", "/create-store", "/login", "/login/x", "/reset-password"]) expect(isPanelPath(path), path).toBe(true)
    for (const path of ["/", "/loja", "/loja/login", "/termos", "/api/stores"]) expect(isPanelPath(path), path).toBe(false)
  })
})

describe("a file, by its address", () => {
  it("is a last segment with an extension, wherever it sits", () => {
    for (const path of ["/favicon.ico", "/icon.png", "/brand/integrations/asaas.svg", "/loja/foto.png", "/robots.txt"]) expect(isFilePath(path), path).toBe(true)
  })

  it("is not a page whose address has a dot before its last segment, nor one with none", () => {
    for (const path of ["/", "/loja", "/loja/produtos/bolsa", "/loja/api/orders/1.5/reorder", "/v1.2/produtos"]) expect(isFilePath(path), path).toBe(false)
  })
})

describe("the shop a page's address names on the platform's host (BEELINK-283)", () => {
  it("is the first segment, with the rest of the address as the shop's own domain spells it", () => {
    expect(shopPageOf("/loja")).toEqual({ slug: "loja", rest: "/" })
    expect(shopPageOf("/loja/produtos/bolsa")).toEqual({ slug: "loja", rest: "/produtos/bolsa" })
    expect(shopPageOf("/loja-2/conta/pedidos/14")).toEqual({ slug: "loja-2", rest: "/conta/pedidos/14" })
    // A page that only has `api` somewhere in it is a page.
    expect(shopPageOf("/loja/apiario")).toEqual({ slug: "loja", rest: "/apiario" })
    expect(shopPageOf("/apiario/produtos")).toEqual({ slug: "apiario", rest: "/produtos" })
  })

  /** A form or a `fetch` already under way must land: no handler is ever sent to another host. */
  it("is none for a handler, the shop's or the platform's", () => {
    for (const path of ["/loja/api", "/loja/api/customer/entrar", "/api", "/api/stores/loja", "/api/storefront/loja/search"]) expect(shopPageOf(path), path).toBeNull()
  })

  it("is none for the root, the panel, a file, or a first segment no slug could be", () => {
    for (const path of ["/", "/admin", "/admin/loja", "/dashboard", "/create-store", "/login", "/verify-email", "/favicon.ico", "/loja/foto.png", "/_next/webpack-hmr", "/Loja", "/lo ja", "/loja.com"]) {
      expect(shopPageOf(path), path).toBeNull()
    }
  })
})
