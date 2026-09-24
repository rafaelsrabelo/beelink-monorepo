// Libs
import { describe, expect, it } from "vitest"

// Types
import type { StoreComponent } from "@harness-monorepo/contracts"

// App
import { toForm, toPayload } from "./component-form-values"

function component(over: Partial<StoreComponent> = {}): StoreComponent {
  return {
    id: "c",
    sectionId: "band",
    kind: "BANNER",
    title: null,
    subtitle: null,
    body: null,
    span: "FULL",
    display: "GRID",
    source: null,
    sourceCategoryId: null,
    limit: null,
    items: [{ id: "s", imageUrl: "/s.jpg", target: "NONE" }],
    columns: null,
    align: null,
    position: 0,
    isActive: true,
    createdAt: "2026-09-24T00:00:00.000Z",
    updatedAt: "2026-09-24T00:00:00.000Z",
    ...over,
  }
}

describe("component-form-values — a banner's format", () => {
  it("opens the sheet on the format the banner has", () => {
    expect(toForm(component(), null).display).toBe("GRID")
  })

  // Null on every kind but a banner; the form holds one anyway, and never sends it for them.
  it("holds a format for a kind that has none, without sending it", () => {
    const heading = toForm(component({ kind: "HEADING", title: "Oi", display: null, items: [] }), null)

    expect(heading.display).toBe("CAROUSEL")
    expect(toPayload(heading, "link")).not.toHaveProperty("display")
  })

  /** The API refuses a display on a kind that does not draw one, so only a banner's save carries it. */
  it("sends the format a banner's sheet holds, not the one it opened with", () => {
    const form = { ...toForm(component({ display: "CAROUSEL" }), null), display: "GRID" as const }

    expect(toPayload(form, "link")).toMatchObject({ display: "GRID" })
  })
})
