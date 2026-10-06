// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { PageRequestError } from "./page-call"
import { fetchPageTemplates, fetchTemplatePreview } from "./page-template-requests"

const PAGE = "0199f000-0000-7000-8000-000000000002"
const PRODUCT = "0199e000-0000-7000-8000-000000000001"

function answer(status: number, body: unknown): string[] {
  const calls: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method} ${url}`)
      return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
    }),
  )
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("fetchPageTemplates", () => {
  it("asks this app's own handler for the page's models", async () => {
    const calls = answer(200, [{ id: "ofertas" }])

    expect(await fetchPageTemplates("loja da ana", PAGE)).toEqual([{ id: "ofertas" }])
    expect(calls).toEqual([`GET /api/stores/loja%20da%20ana/page-templates?pageId=${PAGE}`])
  })
})

describe("fetchTemplatePreview", () => {
  it("names the page, and the product only when there is one", async () => {
    const calls = answer(200, { page: { id: PAGE }, sections: [] })

    await fetchTemplatePreview("lessari", "ofertas", { pageId: PAGE })
    await fetchTemplatePreview("lessari", "lancamento", { pageId: PAGE, productId: PRODUCT })
    // An empty id would be refused as one that is none.
    await fetchTemplatePreview("lessari", "lancamento", { pageId: PAGE, productId: "" })

    expect(calls).toEqual([
      `GET /api/stores/lessari/page-templates/ofertas/preview?pageId=${PAGE}`,
      `GET /api/stores/lessari/page-templates/lancamento/preview?pageId=${PAGE}&productId=${PRODUCT}`,
      `GET /api/stores/lessari/page-templates/lancamento/preview?pageId=${PAGE}`,
    ])
  })

  it("throws the API's code, for the screen to turn into a sentence", async () => {
    answer(400, { statusCode: 400, errorCode: "PAGE_PRODUCT_INVALID", message: "Esse produto não é desta loja." })

    const refused = await fetchTemplatePreview("lessari", "lancamento", { pageId: PAGE, productId: PRODUCT }).catch((error: unknown) => error)

    expect(refused).toBeInstanceOf(PageRequestError)
    expect((refused as PageRequestError).errorCode).toBe("PAGE_PRODUCT_INVALID")
  })
})
