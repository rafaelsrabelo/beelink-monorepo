// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET, POST } from "./route"
import { PUT } from "./reorder/route"

const revalidateStore = vi.hoisted(() => vi.fn())
vi.mock("@/lib/revalidate", () => ({ revalidateStore }))

const SLUG = "doces-da-ana"
const PAGE = "0199f000-0000-7000-8000-000000000002"
const context = { params: Promise.resolve({ slug: SLUG }) }

function request(path: string, method: "GET" | "POST" | "PUT", body?: object): NextRequest {
  return new NextRequest(`http://localhost:3000/api/stores/${SLUG}/sections${path}`, {
    method,
    headers: new Headers({ "content-type": "application/json", origin: "http://localhost:3000", cookie: "bl_access=access-token" }),
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  revalidateStore.mockClear()
})

describe("/api/stores/[slug]/sections — one page at a time", () => {
  it("carries the page to the API on a read, an add and a reorder, and nothing when none is named", async () => {
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (...[, init]) =>
      Response.json(init?.method === "POST" ? { id: "s1" } : [], { status: init?.method === "POST" ? 201 : 200 }),
    )
    vi.stubGlobal("fetch", fetchSpy)

    await GET(request("", "GET"), context)
    await GET(request(`?pageId=${PAGE}`, "GET"), context)
    await POST(request(`?pageId=${PAGE}`, "POST", { component: { kind: "HEADING" } }), context)
    await PUT(request(`/reorder?pageId=${PAGE}`, "PUT", { ids: ["a"] }), context)

    expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
      `http://api.test/api/stores/${SLUG}/sections`,
      `http://api.test/api/stores/${SLUG}/sections?pageId=${PAGE}`,
      `http://api.test/api/stores/${SLUG}/sections?pageId=${PAGE}`,
      `http://api.test/api/stores/${SLUG}/sections/reorder?pageId=${PAGE}`,
    ])
    // The draft is served to nobody: only Publicar drops the shop's cache.
    expect(revalidateStore).not.toHaveBeenCalled()
  })
})
