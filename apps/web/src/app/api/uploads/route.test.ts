/**
 * @vitest-environment node
 *
 * This handler reads a multipart body, and jsdom's `File` is not the `File` undici serialises and
 * parses — appending one produces a FormData that `request.formData()` refuses, in the test
 * environment only. Nothing in a route handler needs a DOM, so it runs in the environment it
 * actually runs in, and the bytes it is handed are the bytes Next would hand it.
 */

// Libs
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// App
import type { CloudinaryConfig } from "@/lib/cloudinary"

const CONFIG: CloudinaryConfig = {
  cloudName: "bee-link-dev",
  apiKey: "123456789",
  apiSecret: "um-segredo-de-teste",
  folder: "bee-link",
}

/**
 * Only the configuration is faked. `uploadImage` stays the real one, so these exercise the
 * signing and the multipart body the handler actually sends — what is stubbed is the network.
 */
const state = vi.hoisted(() => ({ configured: true }))

vi.mock("@/lib/cloudinary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cloudinary")>()
  return {
    ...actual,
    cloudinaryConfig: () => (state.configured ? CONFIG : null),
  }
})

const { POST } = await import("./route")

function request(init: { cookie?: string; origin?: string; file?: File | null } = {}): NextRequest {
  const body = new FormData()
  if (init.file !== null) {
    body.append("file", init.file ?? new File(["bytes"], "logo.png", { type: "image/png" }))
  }

  return new NextRequest("http://localhost:3000/api/uploads", {
    method: "POST",
    headers: new Headers({
      origin: init.origin ?? "http://localhost:3000",
      cookie: init.cookie ?? "bl_access=access-token",
    }),
    body,
  })
}

/**
 * Really that many bytes, not a faked `size`: the file is serialised into a multipart body and
 * parsed back out before the handler sees it, and the round trip reports the length it actually
 * carried. A defined property would survive in the test and vanish in the handler.
 */
function imageOf(type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], "logo.png", { type })
}

beforeEach(() => {
  state.configured = true
  // No test reaches Cloudinary for real. A handler that slips past its stub fails here instead of
  // quietly posting a file to someone's account from CI.
  vi.stubGlobal("fetch", vi.fn(async () => {
    throw new Error("a test reached the network")
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("POST /api/uploads", () => {
  it("answers the stored file's address, and nothing about where it is stored", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ secure_url: "https://res.cloudinary.com/bee-link-dev/logo.png" })),
    )

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ url: "https://res.cloudinary.com/bee-link-dev/logo.png" })
  })

  it("refuses a post from another origin before it reads anything", async () => {
    const response = await POST(request({ origin: "http://evil.test" }))

    expect(response.status).toBe(403)
  })

  it("requires a session, so this is never an open drop box", async () => {
    const response = await POST(request({ cookie: "" }))

    expect(response.status).toBe(401)
  })

  it("refuses with a code the panel can explain when no storage is configured", async () => {
    state.configured = false

    const response = await POST(request())

    expect(response.status).toBe(501)
    expect(await response.json()).toMatchObject({ errorCode: "UPLOAD_NOT_CONFIGURED" })
  })

  it("says so when the body carries no file", async () => {
    const response = await POST(request({ file: null }))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ errorCode: "BAD_REQUEST" })
  })

  it("turns a rejected format into the code the dictionary already has a sentence for", async () => {
    const response = await POST(request({ file: imageOf("image/gif", 1024) }))

    expect(response.status).toBe(415)
    expect(await response.json()).toMatchObject({ errorCode: "UNSUPPORTED_MEDIA_TYPE" })
  })

  it("turns an oversized file into the code the dictionary already has a sentence for", async () => {
    const response = await POST(request({ file: imageOf("image/png", 3 * 1024 * 1024) }))

    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ errorCode: "PAYLOAD_TOO_LARGE" })
  })

  // 502 and not 500: this app is healthy and the picture was fine. Blaming ourselves for a
  // storage outage sends the shopkeeper looking for a problem on their side.
  it("blames the storage service, not this app, when the upload is not accepted", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "nope" }, { status: 401 })))

    const response = await POST(request())

    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ errorCode: "BAD_GATEWAY" })
  })
})
