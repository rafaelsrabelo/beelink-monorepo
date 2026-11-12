// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { affiliateArrivalHref, arriveByLink } from "./affiliate-arrival"

afterEach(() => vi.unstubAllGlobals())

describe("where an affiliate's link leads", () => {
  it("is the shop's front door with the affiliate's name", () => {
    expect(affiliateArrivalHref("/lessari", "joao", {})).toBe("/lessari?afiliado=joao")
    expect(affiliateArrivalHref("/", "joao", {})).toBe("/?afiliado=joao")
  })

  it("is the shop alone for a link that credits nobody", () => {
    expect(affiliateArrivalHref("/lessari", null, {})).toBe("/lessari")
  })

  it("carries what else the address said, and never a second affiliate", () => {
    expect(affiliateArrivalHref("/lessari", "joao", { utm_source: "instagram", afiliado: "maria", tag: ["a", "b"], vazio: undefined })).toBe("/lessari?utm_source=instagram&tag=a&tag=b&afiliado=joao")
  })
})

describe("telling the shop of an arrival", () => {
  it("posts the name to the shop's own handler, with the shop's cookies, and says whether it was kept", async () => {
    const fetched = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal("fetch", fetched)

    expect(await arriveByLink("lessari", "joao")).toBe(true)
    expect(fetched).toHaveBeenCalledWith("/lessari/api/affiliate-arrival", expect.objectContaining({ method: "POST", body: '{"slug":"joao"}', credentials: "same-origin" }))
  })

  it("is nothing kept for a 204, and for a failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })))
    expect(await arriveByLink("lessari", "joao")).toBe(false)

    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))))
    expect(await arriveByLink("lessari", "joao")).toBe(false)
  })
})
