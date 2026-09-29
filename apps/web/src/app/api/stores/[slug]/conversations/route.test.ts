// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"
import { GET as unread } from "./unread/route"

function request(path: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: { "content-type": "application/json", origin: "http://localhost:3000", cookie: "bl_access=owner-access" },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the shop's conversations, for the panel", () => {
  it("pages them at the API as the owner, the query as it came", async () => {
    const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json({ conversations: [], total: 0, page: 1, pageSize: 5 }))
    vi.stubGlobal("fetch", fetched)

    const response = await GET(request("/api/stores/loja/conversations?filter=UNREAD"), { params: Promise.resolve({ slug: "loja" }) })

    expect(response.status).toBe(200)
    expect(String(fetched.mock.calls[0]?.[0])).toContain("/stores/loja/conversations?filter=UNREAD")
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer owner-access")
  })

  it("counts the unread for the bell", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ messages: 3, conversations: 2 })))

    const response = await unread(request("/api/stores/loja/conversations/unread"), { params: Promise.resolve({ slug: "loja" }) })

    expect(await response.json()).toEqual({ messages: 3, conversations: 2 })
  })
})
