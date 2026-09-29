// Libs
import { describe, expect, it } from "vitest"

// App
import { isSignedOutError, panelReturnOf, signInHrefOf } from "./panel-return"

describe("the page to go back to after signing in", () => {
  it("is a page of the panel, with its query", () => {
    expect(panelReturnOf("/admin/loja/orders?status=RECEIVED")).toBe("/admin/loja/orders?status=RECEIVED")
    expect(panelReturnOf("/dashboard")).toBe("/dashboard")
    expect(signInHrefOf("/admin/loja/orders")).toBe("/login?voltar=%2Fadmin%2Floja%2Forders")
  })

  it("is never another site, a shop window or anything that is not a path", () => {
    for (const raw of ["https://evil.example/admin", "//evil.example/admin", "/\\evil.example", "/loja/conta", "admin", "/administrar", null, undefined, ""]) {
      expect(panelReturnOf(raw)).toBeNull()
    }
    expect(signInHrefOf("/loja/conta")).toBe("/login")
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
