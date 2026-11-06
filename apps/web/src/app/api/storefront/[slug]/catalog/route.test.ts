/**
 * @vitest-environment node
 */

// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

const context = { params: Promise.resolve({ slug: "dindin-da-leia" }) }

function ask(query: string, origin = "http://localhost:3000") {
  return new NextRequest(`http://localhost:3000/api/storefront/dindin-da-leia/catalog?${query}`, { headers: { origin } })
}

function stubApi(status: number, body: object) {
  const asked: URL[] = []
  vi.stubGlobal("fetch", (input: string) => {
    asked.push(new URL(input))
    return Promise.resolve(new Response(JSON.stringify(body), { status }))
  })
  return asked
}

const product = { id: "p17", slug: "dindin-de-coco", name: "Dindin de coco", priceCents: 400 }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("GET /api/storefront/[slug]/catalog", () => {
  it("answers the page asked for, with the shelf's own filters, and nothing the page already drew", async () => {
    const asked = stubApi(200, { products: [product], total: 40, page: 2, pageSize: 16, categories: [{ id: "c" }], facets: {}, applied: [], sort: "relevancia" })

    const response = await GET(ask("categoria=dindins&ordenar=menor-preco&porPagina=16&pagina=2"), context)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ products: [product], total: 40, page: 2, pageSize: 16 })
    expect(asked[0]!.pathname).toMatch(/\/stores\/dindin-da-leia\/catalog$/)
    expect(Object.fromEntries(asked[0]!.searchParams)).toMatchObject({ categoria: "dindins", ordenar: "menor-preco", pagina: "2", porPagina: "16" })
  })

  it("refuses a request with no page, and asks the API nothing", async () => {
    const asked = stubApi(200, {})

    expect((await GET(ask("categoria=dindins"), context)).status).toBe(400)
    expect(asked).toHaveLength(0)
  })

  it("says the catalogue did not answer, so the listing offers to try again", async () => {
    stubApi(503, {})

    const response = await GET(ask("pagina=2"), context)

    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ errorCode: "BAD_GATEWAY" })
  })

  it("answers nothing to another site", async () => {
    const asked = stubApi(200, {})

    expect((await GET(ask("pagina=2", "https://evil.example"), context)).status).toBe(403)
    expect(asked).toHaveLength(0)
  })
})
