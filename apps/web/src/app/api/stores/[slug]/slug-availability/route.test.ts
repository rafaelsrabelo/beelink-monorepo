// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { GET } from "./route"

const context = { params: Promise.resolve({ slug: "padaria-do-bairo" }) }

afterEach(() => vi.unstubAllGlobals())

describe("GET /api/stores/[slug]/slug-availability (BEELINK-331)", () => {
  it("asks the API about what was typed, as it was typed, with the token", async () => {
    const answer = { slug: "padaria-do-bairro", available: true, reason: null }
    const fetchSpy = vi.fn(async () => Response.json(answer, { status: 200 }))
    vi.stubGlobal("fetch", fetchSpy)
    const headers = new Headers({ "content-type": "application/json", cookie: "bl_access=access-token", origin: "http://localhost:3000" })

    const response = await GET(new NextRequest("http://localhost:3000/api/stores/padaria-do-bairo/slug-availability?slug=Padaria%20do%20Bairro&outro=1", { headers }), context)

    expect(await response.json()).toEqual(answer)
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://api.test/api/stores/padaria-do-bairo/slug-availability?slug=Padaria+do+Bairro",
      expect.objectContaining({ method: "GET", headers: expect.objectContaining({ authorization: "Bearer access-token" }) }),
    )
  })
})
