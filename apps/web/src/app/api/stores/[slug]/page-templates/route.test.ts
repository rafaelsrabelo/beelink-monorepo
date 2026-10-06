// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET as preview } from "./[templateId]/preview/route"
import { GET } from "./route"

const revalidateStore = vi.hoisted(() => vi.fn())
vi.mock("@/lib/revalidate", () => ({ revalidateStore }))

const SLUG = "doces-da-ana"
const PAGE = "0199f000-0000-7000-8000-000000000002"
const PRODUCT = "0199e000-0000-7000-8000-000000000001"

function request(path: string, origin = "http://localhost:3000", cookie = "bl_access=access-token"): NextRequest {
  return new NextRequest(`http://localhost:3000/api/stores/${SLUG}/page-templates${path}`, {
    method: "GET",
    headers: new Headers({ "content-type": "application/json", origin, ...(cookie ? { cookie } : {}) }),
  })
}

function answer(status: number, body: unknown) {
  const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json(body, { status }))
  vi.stubGlobal("fetch", fetchSpy)
  return fetchSpy
}

const listed = (path = "") => GET(request(path), { params: Promise.resolve({ slug: SLUG }) })
const previewed = (templateId: string, path = "") =>
  preview(request(`/${templateId}/preview${path}`), { params: Promise.resolve({ slug: SLUG, templateId }) })

afterEach(() => {
  vi.unstubAllGlobals()
  revalidateStore.mockClear()
})

describe("/api/stores/[slug]/page-templates", () => {
  it("lists the home's models with the owner's session, and a page's when one is named", async () => {
    const spy = answer(200, [{ id: "ofertas", recommended: true, needs: [] }])

    const response = await listed()
    await listed(`?pageId=${PAGE}&extra=1`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([{ id: "ofertas", recommended: true, needs: [] }])
    expect(spy.mock.calls.map(([url]) => url)).toEqual([
      `http://api.test/api/stores/${SLUG}/page-templates`,
      `http://api.test/api/stores/${SLUG}/page-templates?pageId=${PAGE}`,
    ])
    expect((spy.mock.calls[0]?.[1]?.headers as Record<string, string>).authorization).toBe("Bearer access-token")
  })

  it("previews a model on the page and around the product named, passing on nothing else", async () => {
    const spy = answer(200, { page: { id: PAGE }, sections: [] })

    const response = await previewed("lancamento", `?pageId=${PAGE}&productId=${PRODUCT}&publish=true`)

    expect(response.status).toBe(200)
    expect(spy.mock.calls[0]?.[0]).toBe(`http://api.test/api/stores/${SLUG}/page-templates/lancamento/preview?pageId=${PAGE}&productId=${PRODUCT}`)
    expect(spy.mock.calls[0]?.[1]?.method).toBe("GET")
  })

  // The API refuses `?productId=` as an id that is none; left out, the model answers that it needs one.
  it("leaves an empty value out of the query", async () => {
    const spy = answer(400, { statusCode: 400, errorCode: "PAGE_PRODUCT_REQUIRED", message: "Escolha o produto da página." })

    const response = await previewed("lancamento", "?productId=&categoryId=")

    expect(spy.mock.calls[0]?.[0]).toBe(`http://api.test/api/stores/${SLUG}/page-templates/lancamento/preview`)
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ errorCode: "PAGE_PRODUCT_REQUIRED" })
  })

  it("keeps a model's id inside its own segment of the path", async () => {
    const spy = answer(400, { statusCode: 400, errorCode: "PAGE_TEMPLATE_UNAVAILABLE", message: "No" })

    await previewed("../pages")

    expect(spy.mock.calls[0]?.[0]).toBe(`http://api.test/api/stores/${SLUG}/page-templates/..%2Fpages/preview`)
  })

  // Reads: what a visitor is served did not change, so nothing cached is dropped.
  it("drops no cache: neither route writes", async () => {
    answer(200, [])

    await listed()
    await previewed("ofertas")

    expect(revalidateStore).not.toHaveBeenCalled()
  })

  it("refuses a request from another site before it reaches the API", async () => {
    const spy = answer(200, [])

    const list = await GET(request("", "https://evil.example"), { params: Promise.resolve({ slug: SLUG }) })
    const shown = await preview(request("/ofertas/preview", "https://evil.example"), { params: Promise.resolve({ slug: SLUG, templateId: "ofertas" }) })

    expect([list.status, shown.status]).toEqual([403, 403])
    expect(spy).not.toHaveBeenCalled()
  })
})
