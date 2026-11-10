// Libs
import { describe, expect, it } from "vitest"

// App
import { CART_MAX_LINES, addLine, cartCookieOf, countOf, decodeCart, encodeCart, setLineQty, type CartLine } from "./cart-cookie"

const uuid = (n: number) => `01a0d395-c1ab-7399-a472-${String(n).padStart(12, "0")}`
const line = (n: number, variant: number | null = n, qty = 1): CartLine => ({ productId: uuid(n), variantId: variant === null ? null : uuid(variant + 1000), qty })

describe("the cart cookie", () => {
  it("reads back what it wrote, ids whole again", () => {
    const lines = [line(1), line(2, null, 3)]

    expect(decodeCart(encodeCart(lines))).toEqual(lines)
  })

  it("stays under 4 KB with fifty lines, attributes and all", () => {
    const lines = Array.from({ length: CART_MAX_LINES }, (_, at) => line(at, at, 99))

    expect(new TextEncoder().encode(cartCookieOf({ slug: "uma-loja-de-nome-comprido" }, lines, true)).length).toBeLessThan(4096)
  })

  it("drops what a shopper could have typed wrong, and keeps the rest", () => {
    const good = encodeCart([line(1)])

    expect(decodeCart(`${good}~lixo~a.b.0~a b.c.2~${encodeCart([line(2, null, 2)])}`)).toEqual([line(1), line(2, null, 2)])
    expect(decodeCart(undefined)).toEqual([])
  })

  it("is scoped to the shop, and a cart emptied is a cookie removed", () => {
    expect(cartCookieOf({ slug: "loja" }, [line(1)], false)).toMatch(/^bl_cart=[^;]+; Path=\/loja; Max-Age=2592000; SameSite=Lax$/)
    expect(cartCookieOf({ slug: "loja" }, [], true)).toBe("bl_cart=; Path=/loja; Max-Age=0; SameSite=Lax; Secure")
  })
})

describe("the cart's lines", () => {
  it("add up the same product and combination, and keep another combination apart", () => {
    let lines = addLine([], line(1))
    lines = addLine(lines, line(1, 1, 2))
    lines = addLine(lines, line(1, 7))

    expect(lines.map((entry) => [entry.variantId, entry.qty])).toEqual([
      [uuid(1001), 3],
      [uuid(1007), 1],
    ])
    expect(countOf(lines)).toBe(4)
  })

  it("never pass 99 of one line, nor fifty lines", () => {
    expect(addLine([line(1, 1, 98)], line(1, 1, 5))[0]?.qty).toBe(99)

    const full = Array.from({ length: CART_MAX_LINES }, (_, at) => line(at))
    expect(addLine(full, line(999))).toHaveLength(CART_MAX_LINES)
  })

  it("take a line out when its quantity reaches zero", () => {
    const lines = [line(1), line(2)]

    expect(setLineQty(lines, uuid(1), uuid(1001), 5)[0]?.qty).toBe(5)
    expect(setLineQty(lines, uuid(1), uuid(1001), 0)).toEqual([line(2)])
  })

  // Plan 2026-11-10--kits-monte-seu-kit: a kit's line carries what was chosen for it.
  describe("a kit's line", () => {
    const kit = (parts: [number, number][], qty = 1): CartLine => ({ productId: uuid(90), variantId: null, qty, kit: parts.map(([n, q]) => ({ productId: uuid(n), qty: q })) })

    it("reads back what was chosen for it, ids whole again", () => {
      const lines = [kit([[1, 12], [2, 8]]), line(3)]

      expect(decodeCart(encodeCart(lines))).toEqual(lines)
    })

    it("is one line per choice: the same products add up however they were picked, other ones stand apart", () => {
      const once = addLine([], kit([[1, 12], [2, 8]]))
      const again = addLine(once, kit([[2, 8], [1, 12]]))
      expect(again).toHaveLength(1)
      expect(again[0]?.qty).toBe(2)
      expect(addLine(again, kit([[1, 20]]))).toHaveLength(2)
    })

    it("changes or takes out the line of that choice alone", () => {
      const lines = addLine(addLine([], kit([[1, 12], [2, 8]])), kit([[1, 20]]))
      const kept = setLineQty(lines, uuid(90), null, 0, [{ productId: uuid(1), qty: 20 }])

      expect(kept).toEqual([kit([[1, 12], [2, 8]])])
    })

    it("drops a kit whose products do not read, whole: part of a kit is another kit", () => {
      const raw = `${encodeCart([kit([[1, 12]])]).split("*")[0]}*zero~${encodeCart([line(3)])}`

      expect(decodeCart(raw)).toEqual([line(3)])
    })

    it("adds no line that would take the cookie past what a browser keeps", () => {
      const big = (n: number) => ({ productId: uuid(500 + n), variantId: null, qty: 1, kit: Array.from({ length: 20 }, (_, at) => ({ productId: uuid(n * 100 + at), qty: 1 })) })
      let lines: CartLine[] = []
      for (let n = 0; n < 10; n += 1) lines = addLine(lines, big(n))

      expect(lines.length).toBeLessThan(10)
      expect(new TextEncoder().encode(cartCookieOf({ slug: "uma-loja-de-nome-comprido" }, lines, true)).length).toBeLessThan(4096)
    })
  })
})
