// Libs
import { createHash } from "node:crypto"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import type { CloudinaryConfig } from "./cloudinary"
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, toCloudinaryConfig, uploadImage } from "./cloudinary"

const config: CloudinaryConfig = {
  cloudName: "bee-link-dev",
  apiKey: "123456789",
  apiSecret: "um-segredo-de-teste",
  folder: "bee-link",
}

function imageOf(type = "image/png", size = 1024): File {
  const file = new File(["bytes"], "logo.png", { type })
  Object.defineProperty(file, "size", { value: size })
  return file
}

/** Answers like Cloudinary and keeps the body, so what was signed and sent can be inspected. */
function stubCloudinary(response: Response) {
  const fetch = vi.fn(async () => response)
  vi.stubGlobal("fetch", fetch)
  return {
    body: () => (fetch.mock.calls[0] as unknown as [string, { body: FormData }])[1].body,
    url: () => (fetch.mock.calls[0] as unknown as [string])[0],
    calls: () => fetch.mock.calls.length,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("toCloudinaryConfig", () => {
  it("reads a complete configuration", () => {
    expect(
      toCloudinaryConfig({
        CLOUDINARY_CLOUD_NAME: "bee-link-dev",
        CLOUDINARY_API_KEY: "123456789",
        CLOUDINARY_API_SECRET: "um-segredo-de-teste",
        CLOUDINARY_FOLDER: "bee-link",
      }),
    ).toEqual(config)
  })

  // Half a configuration is worse than none: the panel would look switched on and fail at the
  // first file, with a 502 that blames a service nobody configured.
  it.each(["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const)(
    "treats a configuration missing %s as no configuration at all",
    (missing) => {
      const env = {
        CLOUDINARY_CLOUD_NAME: "bee-link-dev",
        CLOUDINARY_API_KEY: "123456789",
        CLOUDINARY_API_SECRET: "um-segredo-de-teste",
        CLOUDINARY_FOLDER: "bee-link",
      }
      delete env[missing]

      expect(toCloudinaryConfig(env)).toBeNull()
    },
  )
})

describe("uploadImage", () => {
  it("answers the stored file's https address", async () => {
    stubCloudinary(
      Response.json({ secure_url: "https://res.cloudinary.com/bee-link-dev/image/upload/v1/logo.png" }),
    )

    expect(await uploadImage(imageOf(), config)).toEqual({
      status: "uploaded",
      url: "https://res.cloudinary.com/bee-link-dev/image/upload/v1/logo.png",
    })
  })

  it("posts to the configured cloud, signed, and never sends the secret", async () => {
    const cloudinary = stubCloudinary(Response.json({ secure_url: "https://res.cloudinary.com/x.png" }))

    await uploadImage(imageOf(), config)
    const body = cloudinary.body()

    expect(cloudinary.url()).toBe("https://api.cloudinary.com/v1_1/bee-link-dev/image/upload")
    expect(body.get("api_key")).toBe("123456789")
    expect(body.get("folder")).toBe("bee-link")
    expect(body.get("signature")).toMatch(/^[0-9a-f]{40}$/)
    // The secret signs the request; it is never part of it. An upload that carried it would hand
    // a write credential to anyone who could read the request.
    expect([...body.keys()]).not.toContain("api_secret")
    expect(JSON.stringify([...body.entries()])).not.toContain(config.apiSecret)
  })

  /**
   * Pins the string that gets signed, which is the half of this that cannot be checked locally.
   * Cloudinary echoes it back on a refusal — "String to sign - 'folder=…&timestamp=…'" — and this
   * is that exact shape: the signed params, sorted by name, joined with `&`, secret appended, no
   * `file` and no `api_key`. Get it wrong and every upload is a 401 that blames the signature.
   */
  it("signs the parameters in the shape Cloudinary verifies", async () => {
    const cloudinary = stubCloudinary(Response.json({ secure_url: "https://res.cloudinary.com/x.png" }))

    await uploadImage(imageOf(), config)
    const body = cloudinary.body()
    const timestamp = String(body.get("timestamp"))

    expect(body.get("signature")).toBe(
      createHash("sha1")
        .update(`folder=${config.folder}&timestamp=${timestamp}` + config.apiSecret, "utf8")
        .digest("hex"),
    )
  })

  it("signs with the secret and the folder, so neither can be swapped unnoticed", async () => {
    const signatures: string[] = []

    for (const variant of [
      config,
      { ...config, apiSecret: "outro-segredo" },
      { ...config, folder: "outra-pasta" },
    ]) {
      const cloudinary = stubCloudinary(Response.json({ secure_url: "https://res.cloudinary.com/x.png" }))
      await uploadImage(imageOf(), variant)
      signatures.push(String(cloudinary.body().get("signature")))
      vi.unstubAllGlobals()
    }

    expect(new Set(signatures).size).toBe(3)
  })

  it("prefers secure_url — the plain url is http and the panel is served over https", async () => {
    stubCloudinary(
      Response.json({
        url: "http://res.cloudinary.com/bee-link-dev/image/upload/v1/logo.png",
        secure_url: "https://res.cloudinary.com/bee-link-dev/image/upload/v1/logo.png",
      }),
    )

    const uploaded = await uploadImage(imageOf(), config)

    expect(uploaded).toMatchObject({ url: expect.stringMatching(/^https:/) })
  })

  // A 200 carrying no address is not a success: answering "uploaded" with "" writes an empty
  // logoUrl and loses the shop's picture with no error anywhere.
  it("refuses an answer that carries no address, however successful it looked", async () => {
    stubCloudinary(Response.json({ public_id: "logo" }))

    expect(await uploadImage(imageOf(), config)).toEqual({ status: "unavailable" })
  })

  it("refuses a format outside the accepted list without calling out", async () => {
    const cloudinary = stubCloudinary(Response.json({ secure_url: "https://res.cloudinary.com/x.png" }))

    expect(await uploadImage(imageOf("image/gif"), config)).toEqual({ status: "unsupported" })
    expect(cloudinary.calls()).toBe(0)
  })

  it.each(ACCEPTED_TYPES)("accepts %s", async (type) => {
    stubCloudinary(Response.json({ secure_url: "https://res.cloudinary.com/x.png" }))

    expect(await uploadImage(imageOf(type), config)).toMatchObject({ status: "uploaded" })
  })

  it("refuses a file over the ceiling without calling out", async () => {
    const cloudinary = stubCloudinary(Response.json({ secure_url: "https://res.cloudinary.com/x.png" }))

    expect(await uploadImage(imageOf("image/png", MAX_UPLOAD_BYTES + 1), config)).toEqual({
      status: "too-large",
    })
    expect(cloudinary.calls()).toBe(0)
  })

  it("reads a refusal from Cloudinary as unavailable, whatever it blamed", async () => {
    stubCloudinary(Response.json({ error: { message: "Invalid signature" } }, { status: 401 }))

    expect(await uploadImage(imageOf(), config)).toEqual({ status: "unavailable" })
  })

  it("survives a network that never answered", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNRESET") }))

    expect(await uploadImage(imageOf(), config)).toEqual({ status: "unavailable" })
  })
})
