// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { PageRequestError } from "./page-call"
import { useDraftRevision } from "@/stores/draft-revision"
import { applyTemplate, fetchPageTemplates, fetchTemplatePreview } from "./page-template-requests"

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
  useDraftRevision.setState({ editing: {}, revisions: {}, sending: {}, stale: false })
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

describe("applyTemplate", () => {
  function answerWrite(status: number, body: unknown) {
    const spy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify(body), { status }))
    vi.stubGlobal("fetch", spy)
    return spy
  }

  it("posts the model and its product to the page's handler, naming the revision the editor read", async () => {
    const spy = answerWrite(200, { revision: 8, sections: [] })
    useDraftRevision.getState().open("lessari", PAGE)
    useDraftRevision.getState().saw(PAGE, 7)

    const draft = await applyTemplate("lessari", PAGE, { template: "lancamento", productId: PRODUCT })

    expect(draft).toEqual({ revision: 8, sections: [] })
    expect(spy.mock.calls[0]?.[0]).toBe(`/api/stores/lessari/pages/${PAGE}/apply-template`)
    const init = spy.mock.calls[0]?.[1]
    expect(init?.method).toBe("POST")
    expect(JSON.parse(String(init?.body))).toEqual({ template: "lancamento", productId: PRODUCT })
    expect((init?.headers as Record<string, string>)["x-page-revision"]).toBe("7")
    // The write landed: the next one names the revision it left.
    expect(useDraftRevision.getState().revisions[PAGE]).toBe(8)
  })

  it("tells the editor to reload when another tab changed the page first, and leaves the revision where it was", async () => {
    answerWrite(409, { statusCode: 409, errorCode: "PAGE_DRAFT_STALE", message: "Outra aba" })
    useDraftRevision.getState().open("lessari", PAGE)
    useDraftRevision.getState().saw(PAGE, 7)

    const refused = await applyTemplate("lessari", PAGE, { template: "ofertas" }).catch((error: unknown) => error)

    expect((refused as PageRequestError).errorCode).toBe("PAGE_DRAFT_STALE")
    expect(useDraftRevision.getState().stale).toBe(true)
    expect(useDraftRevision.getState().revisions[PAGE]).toBe(7)
  })

  it("throws a refusal's code and does not call the page stale for it", async () => {
    answerWrite(400, { statusCode: 400, errorCode: "PAGE_TEMPLATE_UNAVAILABLE", message: "No" })

    const refused = await applyTemplate("lessari", PAGE, { template: "ofertas" }).catch((error: unknown) => error)

    expect((refused as PageRequestError).errorCode).toBe("PAGE_TEMPLATE_UNAVAILABLE")
    expect(useDraftRevision.getState().stale).toBe(false)
  })
})
