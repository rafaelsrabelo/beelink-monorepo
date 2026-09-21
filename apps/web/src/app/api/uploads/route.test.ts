/**
 * @vitest-environment node
 *
 * A route handler needs no DOM, and under jsdom the `File` global is not the one undici
 * serialises — a multipart body built with it is one this handler could not pass on.
 */

// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { POST } from "./route"

function multipartRequest(init: { cookie?: string; origin?: string; contentType?: string } = {}): NextRequest {
  const body = new FormData()
  body.append("file", new File([new Uint8Array(10)], "logo.png", { type: "image/png" }))

  const request = new NextRequest("http://localhost:3000/api/uploads", {
    method: "POST",
    headers: new Headers({
      origin: init.origin ?? "http://localhost:3000",
      cookie: init.cookie ?? "bl_access=access-token",
    }),
    body,
  })

  if (init.contentType) request.headers.set("content-type", init.contentType)

  return request
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("POST /api/uploads", () => {
  it("hands the file to the API with the token the browser never holds", async () => {
    const fetch = vi.fn(async () => Response.json({ url: "https://res.cloudinary.com/bee-link/logo.png" }))
    vi.stubGlobal("fetch", fetch)

    const response = await POST(multipartRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ url: "https://res.cloudinary.com/bee-link/logo.png" })

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/uploads$/)
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer access-token")
    // The caller's own content-type, boundary included. Rewriting it would leave the API with a
    // boundary that no longer matches the bytes.
    expect((init.headers as Record<string, string>)["content-type"]).toMatch(/^multipart\/form-data; boundary=/)
  })

  /**
   * This is what the handler got wrong while it called Cloudinary itself: it checked that a cookie
   * was present, which anybody can arrange. Nothing here validates a token — the API does — so the
   * only correct thing this app can do is attach it and forward.
   */
  it("never decides for itself that a caller is signed in", async () => {
    const fetch = vi.fn(async () => Response.json({ url: "https://res.cloudinary.com/x.png" }))
    vi.stubGlobal("fetch", fetch)

    await POST(multipartRequest({ cookie: "bl_access=nao-sou-um-token" }))

    // Forwarded, not judged: the value goes upstream as a bearer and the API refuses it.
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer nao-sou-um-token")
  })

  it("answers the API's refusal unchanged, so the panel has one error shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ statusCode: 413, errorCode: "PAYLOAD_TOO_LARGE", message: "too big" }, { status: 413 }),
      ),
    )

    const response = await POST(multipartRequest())

    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ errorCode: "PAYLOAD_TOO_LARGE" })
  })

  it("refuses without a session before it calls anything", async () => {
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)

    const response = await POST(multipartRequest({ cookie: "" }))

    expect(response.status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("refuses a post from another origin before it reads anything", async () => {
    const response = await POST(multipartRequest({ origin: "http://evil.test" }))

    expect(response.status).toBe(403)
  })

  it("refuses a body that is not multipart", async () => {
    const response = await POST(multipartRequest({ contentType: "application/json" }))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ errorCode: "BAD_REQUEST" })
  })
})
