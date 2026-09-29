// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { decodeCart } from "@/lib/cart-cookie"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/storefront-data", () => ({
  shopAt: async (slug: string) =>
    slug === "loja"
      ? {
          slug: "loja",
          routeWords: {
            products: "produtos",
            categories: "categorias",
            search: "busca",
            cart: "carrinho",
            signIn: "entrar",
            account: "conta",
            accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", profile: "perfil", messages: "conversas" },
          },
        }
      : null,
}))

const { POST } = await import("./route")

const P1 = "11111111-1111-1111-1111-111111111111"
const V1 = "22222222-2222-2222-2222-222222222222"
const V2 = "33333333-3333-3333-3333-333333333333"

function post(init: { origin?: string | null; cookie?: string } = {}, number = "14") {
  const headers = new Headers()
  if (init.origin !== null) headers.set("origin", init.origin ?? "http://localhost:3000")
  if (init.cookie) headers.set("cookie", init.cookie)
  const request = new NextRequest(`http://localhost:3000/loja/api/orders/${number}/reorder`, { method: "POST", headers })
  return POST(request, { params: Promise.resolve({ slug: "loja", number }) })
}

/** The cart the answer writes, as lines. */
function cartOf(response: Response) {
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith("bl_cart="))
  return cookie ? decodeCart(cookie.slice("bl_cart=".length).split(";")[0]) : null
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("buying an order again", () => {
  it("adds the order's lines to the cart it finds, and goes to the cart saying which order they came from", async () => {
    const fetched = vi.fn(async () => Response.json({ number: 14, lines: [{ productId: P1, variantId: V1, quantity: 2 }, { productId: P1, variantId: V2, quantity: 1 }], left: [] }))
    vi.stubGlobal("fetch", fetched)

    const response = await post({ cookie: `bl_shopper_access=shopper-access; bl_cart=${P1.replaceAll("-", "")}.${V1.replaceAll("-", "")}.1` })

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("http://localhost:3000/loja/carrinho?repetido=14")
    expect(String((fetched.mock.calls[0] as unknown[] | undefined)?.[0])).toContain("/stores/loja/customer/orders/14/reorder")
    // Added to what was there, as the product page's "add" does.
    expect(cartOf(response)).toEqual([
      { productId: P1, variantId: V1, qty: 3 },
      { productId: P1, variantId: V2, qty: 1 },
    ])
    expect(response.headers.getSetCookie().find((value) => value.startsWith("bl_cart="))).toContain("Path=/loja")
  })

  it("leaves the cart as it was and says so when the order could not be read", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 404, errorCode: "ORDER_NOT_FOUND", message: "x" }, { status: 404 })))

    const response = await post({ cookie: "bl_shopper_access=shopper-access" })

    expect(response.headers.get("location")).toBe("http://localhost:3000/loja/carrinho?repetido=14&falhou=1")
    expect(cartOf(response)).toBeNull()
  })

  it("sends a shopper whose session ended to sign in, and back to the order", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 })))

    const response = await post({ cookie: "bl_shopper_access=old" })

    expect(response.headers.get("location")).toBe("http://localhost:3000/loja/entrar?voltar=%2Floja%2Fconta%2Fpedidos%2F14")
  })

  it("refuses a post from another site, and a number that is none", async () => {
    vi.stubGlobal("fetch", vi.fn())

    expect((await post({ origin: "https://evil.example" })).status).toBe(403)
    expect((await post({}, "abc")).status).toBe(404)
  })
})
