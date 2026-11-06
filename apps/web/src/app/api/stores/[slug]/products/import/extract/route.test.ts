/**
 * @vitest-environment node
 *
 * As in `src/app/api/uploads/route.test.ts`: under jsdom the `File` global is not the one undici
 * serialises, and a multipart body built with it is one this handler could not pass on.
 */

// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

const context = { params: Promise.resolve({ slug: "dindin-da-leia" }) }

function menuRequest(init: { origin?: string; json?: boolean } = {}): NextRequest {
  const headers = new Headers({ origin: init.origin ?? "http://localhost:3000", cookie: "bl_access=access-token" })
  if (init.json) {
    headers.set("content-type", "application/json")
    return new NextRequest("http://localhost:3000/api/stores/dindin-da-leia/products/import/extract", {
      method: "POST",
      headers,
      body: "{}",
    })
  }

  const body = new FormData()
  body.append("file", new File([new TextEncoder().encode("%PDF-1.7")], "cardapio.pdf", { type: "application/pdf" }))
  return new NextRequest("http://localhost:3000/api/stores/dindin-da-leia/products/import/extract", {
    method: "POST",
    headers,
    body,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("POST /api/stores/[slug]/products/import/extract", () => {
  it("hands the menu through to the shop's read, with the token and the caller's address", async () => {
    const fetch = vi.fn(async () => Response.json({ drafts: [] }))
    vi.stubGlobal("fetch", fetch)

    const response = await POST(menuRequest(), context)

    expect(response.status).toBe(200)
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/stores\/dindin-da-leia\/products\/import\/extract$/)
    const headers = init.headers as Record<string, string>
    expect(headers.authorization).toBe("Bearer access-token")
    expect(headers["content-type"]).toMatch(/^multipart\/form-data; boundary=/)
  })

  it("answers the API's refusal unchanged", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ statusCode: 422, errorCode: "PRODUCT_IMPORT_UNREADABLE", message: "nothing" }, { status: 422 }),
      ),
    )

    const response = await POST(menuRequest(), context)

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ errorCode: "PRODUCT_IMPORT_UNREADABLE" })
  })

  it("sends nothing that is not multipart, and nothing from another site", async () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)

    expect((await POST(menuRequest({ json: true }), context)).status).toBe(400)
    expect((await POST(menuRequest({ origin: "https://evil.example" }), context)).status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })
})
