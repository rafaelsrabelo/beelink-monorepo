// Libs
import { describe, expect, it, vi } from "vitest"

// App
import { AFFILIATE_SEGMENT_FRESH_MS, createAffiliateSegments, type AffiliateSegment } from "./affiliate-segments"

vi.mock("server-only", () => ({}))

describe("whose sub-site a shop's first segment is (the user's call of 12/11)", () => {
  it("asks only of a name an affiliate could have, and keeps each answer a minute", async () => {
    let now = 0
    const read = vi.fn(async (_shop: string, name: string): Promise<AffiliateSegment> => (name === "margarida" ? { kind: "credits", name } : { kind: "none" }))
    const segmentAt = createAffiliateSegments(read, () => now)

    expect(await segmentAt("loja", "Margarida")).toEqual({ kind: "credits", name: "margarida" })
    expect(await segmentAt("loja", "margarida")).toEqual({ kind: "credits", name: "margarida" })
    expect(await segmentAt("loja", "a")).toEqual({ kind: "none" })
    expect(await segmentAt("loja", "favicon.ico")).toEqual({ kind: "none" })
    expect(read).toHaveBeenCalledOnce()

    now += AFFILIATE_SEGMENT_FRESH_MS
    await segmentAt("loja", "margarida")
    expect(read).toHaveBeenCalledTimes(2)
  })

  it("serves the shop's own page when the API cannot be read, and asks again next time", async () => {
    const read = vi.fn(async (): Promise<AffiliateSegment> => {
      throw new Error("down")
    })
    const segmentAt = createAffiliateSegments(read, () => 0)

    expect(await segmentAt("loja", "margarida")).toEqual({ kind: "none" })
    await segmentAt("loja", "margarida")
    expect(read).toHaveBeenCalledTimes(2)
  })
})
