// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { createSectionRow, moveComponent, PageRequestError } from "./page-requests"

const band = { id: "s1", components: [{ id: "c1", kind: "BANNER" }] }

/** Every request, answered in order, and remembered as "METHOD path body". */
function answerInOrder(...answers: { status: number; body: unknown }[]): string[] {
  const calls: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method} ${url} ${init?.body ?? ""}`)
      const answer = answers.shift() ?? { status: 201, body: band }
      return new Response(JSON.stringify(answer.body), {
        status: answer.status,
        headers: { "content-type": "application/json" },
      })
    }),
  )
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("createSectionRow", () => {
  // Blocks share a row only inside one band, so three banners in a row are one band holding three.
  it("builds the band around the first banner and adds the others into that same band", async () => {
    const calls = answerInOrder()
    const banner = { kind: "BANNER", span: "THIRD" } as const

    const section = await createSectionRow("lessari", { component: banner, position: 2 }, 2)

    expect(section.id).toBe("s1")
    expect(calls).toEqual([
      `POST /api/stores/lessari/sections ${JSON.stringify({ component: banner, position: 2 })}`,
      `POST /api/stores/lessari/sections/s1/components ${JSON.stringify(banner)}`,
      `POST /api/stores/lessari/sections/s1/components ${JSON.stringify(banner)}`,
    ])
  })

  it("writes the band alone when nothing goes beside it", async () => {
    const calls = answerInOrder()

    await createSectionRow("lessari", { component: { kind: "HEADING" } }, 0)

    expect(calls).toHaveLength(1)
  })

  it("says so when a banner of the row is refused, after the band is written", async () => {
    const calls = answerInOrder(
      { status: 201, body: band },
      { status: 400, body: { errorCode: "VALIDATION_FAILED" } },
    )

    await expect(
      createSectionRow("lessari", { component: { kind: "BANNER", span: "HALF" } }, 1),
    ).rejects.toBeInstanceOf(PageRequestError)
    expect(calls[0]).toContain("POST /api/stores/lessari/sections ")
  })
})

describe("moveComponent", () => {
  it("puts the block's new band, place and span to its own route, and answers the whole page", async () => {
    const calls = answerInOrder({ status: 200, body: [band] })
    const payload = { sectionId: "s2", position: 1, span: "HALF" } as const

    const page = await moveComponent("lessari", "c1", payload)

    expect(page).toEqual([band])
    expect(calls).toEqual([`PUT /api/stores/lessari/components/c1/section ${JSON.stringify(payload)}`])
  })

  it("throws the API's code, never a sentence, when the move is refused", async () => {
    answerInOrder({ status: 409, body: { errorCode: "COMPONENT_NOT_MOVABLE" } })

    await expect(moveComponent("lessari", "c1", { sectionId: "s2" })).rejects.toMatchObject({
      errorCode: "COMPONENT_NOT_MOVABLE",
    })
  })
})
