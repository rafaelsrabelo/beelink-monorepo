// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET as availability } from "./availability/route"
import { POST as publish } from "./[pageId]/publish/route"
import { PATCH } from "./[pageId]/route"
import { GET, POST } from "./route"

const revalidateStore = vi.hoisted(() => vi.fn())
vi.mock("@/lib/revalidate", () => ({ revalidateStore }))

const SLUG = "doces-da-ana"
const PAGE = "0199f000-0000-7000-8000-000000000002"

function request(path: string, method: "GET" | "POST" | "PATCH", body?: object, origin = "http://localhost:3000"): NextRequest {
  return new NextRequest(`http://localhost:3000/api/stores/${SLUG}/pages${path}`, {
    method,
    headers: new Headers({ "content-type": "application/json", origin, cookie: "bl_access=access-token" }),
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

function answer(status: number, body: unknown) {
  const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json(body, { status }))
  vi.stubGlobal("fetch", fetchSpy)
  return fetchSpy
}

afterEach(() => {
  vi.unstubAllGlobals()
  revalidateStore.mockClear()
})

describe("/api/stores/[slug]/pages", () => {
  it("lists the pages and makes a landing without dropping the shop's cache — a draft is served to nobody", async () => {
    const spy = answer(201, { id: PAGE })

    await GET(request("", "GET"), { params: Promise.resolve({ slug: SLUG }) })
    await POST(request("", "POST", { title: "Lançamento", template: "em-branco" }), { params: Promise.resolve({ slug: SLUG }) })

    expect(spy.mock.calls.map(([url]) => url)).toEqual([`http://api.test/api/stores/${SLUG}/pages`, `http://api.test/api/stores/${SLUG}/pages`])
    expect(revalidateStore).not.toHaveBeenCalled()
  })

  it("drops the shop's cache when a landing changes, so a page taken down stops answering at once", async () => {
    const spy = answer(200, { id: PAGE, status: "ARCHIVED" })

    const response = await PATCH(request(`/${PAGE}`, "PATCH", { status: "ARCHIVED" }), {
      params: Promise.resolve({ slug: SLUG, pageId: PAGE }),
    })

    expect(response.status).toBe(200)
    expect(spy).toHaveBeenCalledWith(`http://api.test/api/stores/${SLUG}/pages/${PAGE}`, expect.objectContaining({ method: "PATCH" }))
    expect(revalidateStore).toHaveBeenCalledWith(SLUG)
  })

  it("leaves the cache alone when the patch is refused", async () => {
    answer(409, { statusCode: 409, errorCode: "PAGE_SLUG_TAKEN", message: "No" })

    const response = await PATCH(request(`/${PAGE}`, "PATCH", { slug: "ofertas" }), { params: Promise.resolve({ slug: SLUG, pageId: PAGE }) })

    expect(response.status).toBe(409)
    expect(revalidateStore).not.toHaveBeenCalled()
  })

  it("asks whether an address is free with the address and the page being renamed, and nothing else", async () => {
    const spy = answer(200, { slug: "ofertas", available: true, reason: null })

    await availability(request(`/availability?slug=Ofertas&except=${PAGE}&extra=1`, "GET"), { params: Promise.resolve({ slug: SLUG }) })

    expect(spy.mock.calls[0]?.[0]).toBe(`http://api.test/api/stores/${SLUG}/pages/availability?slug=Ofertas&except=${PAGE}`)
  })

  it("drops the shop's cache on Publicar, the one write a visitor is served", async () => {
    const spy = answer(201, { page: { id: PAGE }, version: { number: 2 } })

    const response = await publish(request(`/${PAGE}/publish`, "POST", { note: "Black Friday" }), {
      params: Promise.resolve({ slug: SLUG, pageId: PAGE }),
    })

    expect(response.status).toBe(201)
    expect(spy).toHaveBeenCalledWith(`http://api.test/api/stores/${SLUG}/pages/${PAGE}/publish`, expect.objectContaining({ method: "POST" }))
    expect(revalidateStore).toHaveBeenCalledWith(SLUG)
  })

  it("refuses a request from another site before it reaches the API", async () => {
    const spy = answer(200, {})

    const response = await PATCH(request(`/${PAGE}`, "PATCH", { status: "PUBLISHED" }, "https://evil.example"), {
      params: Promise.resolve({ slug: SLUG, pageId: PAGE }),
    })

    expect(response.status).toBe(403)
    expect(spy).not.toHaveBeenCalled()
  })
})
