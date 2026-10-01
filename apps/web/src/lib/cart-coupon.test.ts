// Libs
import { describe, expect, it } from "vitest"

// App
import { backWithCoupon, couponIn, pathWithCoupon, waysBackWithCoupon } from "./cart-coupon"
import { safeBackOf } from "./storefront-routes"

describe("the coupon in the cart's address", () => {
  it("reads a code, and drops what is not one: an address is anyone's to write", () => {
    expect(couponIn("BEMVINDO10")).toBe("BEMVINDO10")
    expect(couponIn("frete-gratis_2")).toBe("frete-gratis_2")
    expect(couponIn(undefined)).toBeNull()
    expect(couponIn("")).toBeNull()
    expect(couponIn("AB")).toBeNull()
    expect(couponIn("A".repeat(31))).toBeNull()
    expect(couponIn("<script>alert(1)</script>")).toBeNull()
    expect(couponIn("X Y")).toBeNull()
    // `?cupom=A&cupom=B` is two answers, which is none.
    expect(couponIn(["BEMVINDO10", "OUTRO"])).toBeNull()
  })

  it("puts the coupon in a path, replaces the one there, and takes it out — keeping the rest of the query", () => {
    expect(pathWithCoupon("/loja/carrinho", "BEMVINDO10")).toBe("/loja/carrinho?cupom=BEMVINDO10")
    expect(pathWithCoupon("/loja/carrinho?entregar=a1&cupom=VELHO", "BEMVINDO10")).toBe("/loja/carrinho?entregar=a1&cupom=BEMVINDO10")
    expect(pathWithCoupon("/loja/carrinho?cupom=BEMVINDO10&entregar=a1", null)).toBe("/loja/carrinho?entregar=a1")
    expect(pathWithCoupon("/loja/carrinho?cupom=BEMVINDO10", null)).toBe("/loja/carrinho")
  })

  it("makes a link that comes back to the cart come back with the coupon", () => {
    const addAddress = "/loja/conta/perfil?endereco=novo&voltar=%2Floja%2Fcarrinho"

    const carried = backWithCoupon(addAddress, "BEMVINDO10")

    expect(new URL(carried, "http://x").searchParams.get("voltar")).toBe("/loja/carrinho?cupom=BEMVINDO10")
    expect(new URL(carried, "http://x").searchParams.get("endereco")).toBe("novo")
    // And without one again, once the coupon is taken off.
    expect(new URL(backWithCoupon(carried, null), "http://x").searchParams.get("voltar")).toBe("/loja/carrinho")
  })

  it("carries it in every way out of the cart at once, each keeping its own name", () => {
    const ways = waysBackWithCoupon({ signInHref: "/loja/entrar?voltar=%2Floja%2Fcarrinho", editHref: "/loja/conta/perfil?voltar=%2Floja%2Fcarrinho" }, "BEMVINDO10")

    expect(Object.keys(ways)).toEqual(["signInHref", "editHref"])
    expect(Object.values(ways).map((href) => new URL(href, "http://x").searchParams.get("voltar"))).toEqual(["/loja/carrinho?cupom=BEMVINDO10", "/loja/carrinho?cupom=BEMVINDO10"])
  })

  it("leaves a link with no way back as it is", () => {
    expect(backWithCoupon("/loja/produtos", "BEMVINDO10")).toBe("/loja/produtos")
  })

  /** The way back is followed only inside the shop: carrying the coupon must not make it fail that check. */
  it("is still a way back the shop follows", () => {
    const back = new URL(backWithCoupon("/loja/entrar?voltar=%2Floja%2Fcarrinho", "BEMVINDO10"), "http://x").searchParams.get("voltar")

    expect(safeBackOf("loja", back)).toBe("/loja/carrinho?cupom=BEMVINDO10")
  })
})
