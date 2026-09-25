// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

const SLUG = "loja"
const context = { params: Promise.resolve({ slug: SLUG }) }

afterEach(() => vi.unstubAllGlobals())

describe("GET /api/storefront/[slug]/search", () => {
  // The dropdown shows one photo per suggestion; a card's gallery is the shelf's, not the wire's.
  it("answers suggestions without the cards' photo galleries", async () => {
    const card = { id: "p1", slug: "whey", name: "Whey", priceCents: 9990, compareAtPriceCents: null, imageUrl: "/capa.jpg", imageUrls: ["/capa.jpg", "/2.jpg"], optionSummary: null }
    vi.stubGlobal("fetch", async () => Response.json({ products: [card], total: 1 }))

    const response = await GET(
      new NextRequest(`http://localhost:3000/api/storefront/${SLUG}/search?q=whey`, { headers: new Headers({ origin: "http://localhost:3000" }) }),
      context,
    )
    const body = (await response.json()) as { products: Record<string, unknown>[] }

    expect(body.products[0]).toMatchObject({ slug: "whey", imageUrl: "/capa.jpg" })
    expect(body.products[0]).not.toHaveProperty("imageUrls")
  })
})
