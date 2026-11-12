// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { arriveByLink } from "./affiliate-arrival"

afterEach(() => vi.unstubAllGlobals())

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
