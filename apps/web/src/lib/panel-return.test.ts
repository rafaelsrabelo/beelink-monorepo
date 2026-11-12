// Libs
import { describe, expect, it } from "vitest"

// App
import { isSignedOutError, panelReturnOf, sessionEndedHrefOf, signInHrefOf } from "./panel-return"

describe("the page to go back to after signing in", () => {
  it("is a page of the panel, with its query", () => {
    expect(panelReturnOf("/admin/loja/orders?status=RECEIVED")).toBe("/admin/loja/orders?status=RECEIVED")
    expect(panelReturnOf("/dashboard")).toBe("/dashboard")
    expect(signInHrefOf("/admin/loja/orders")).toBe("/login?voltar=%2Fadmin%2Floja%2Forders")
  })

  it("is the affiliate's invite, with its token (IMPULSEIA-104) — and nothing under it", () => {
    expect(panelReturnOf("/afiliado/convite?token=abc")).toBe("/afiliado/convite?token=abc")
    expect(signInHrefOf("/afiliado/convite?token=abc")).toBe("/login?voltar=%2Fafiliado%2Fconvite%3Ftoken%3Dabc")
    expect(panelReturnOf("/afiliado/convite/outra")).toBeNull()
  })

  it("is a page of the affiliate's own area, with its section (IMPULSEIA-108)", () => {
    expect(panelReturnOf("/afiliado")).toBe("/afiliado")
    expect(panelReturnOf("/afiliado/loja-da-ana?aba=extrato")).toBe("/afiliado/loja-da-ana?aba=extrato")
    expect(panelReturnOf("/afiliados")).toBeNull()
  })

  it("is never another site, a shop window or anything that is not a path", () => {
    for (const raw of ["https://evil.example/admin", "//evil.example/admin", "/\\evil.example", "/loja/conta", "admin", "/administrar", null, undefined, ""]) {
      expect(panelReturnOf(raw)).toBeNull()
    }
    expect(signInHrefOf("/loja/conta")).toBe("/login")
    expect(sessionEndedHrefOf("/admin/loja")).toBe("/api/session/expired?voltar=%2Fadmin%2Floja")
    expect(sessionEndedHrefOf("//evil.example")).toBe("/api/session/expired")
  })
})

describe("an answer that ends the session", () => {
  it("is the API's unauthenticated code, and nothing else", () => {
    expect(isSignedOutError({ errorCode: "AUTH_UNAUTHENTICATED" })).toBe(true)
    expect(isSignedOutError({ errorCode: "STORE_FORBIDDEN" })).toBe(false)
    expect(isSignedOutError(new Error("offline"))).toBe(false)
    expect(isSignedOutError(null)).toBe(false)
  })
})
