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

describe("component-form-values — the categories' format", () => {
  const categories = (display: "RAIL" | "GRID" | null) =>
    toForm(component({ kind: "CATEGORIES", title: null, display, items: [] }), null)

  // A block saved before it could choose drew a grid, and opens on the grid it draws.
  it("opens on the format the block has, and on the grid when it has none", () => {
    expect(categories("RAIL").display).toBe("RAIL")
    expect(categories("GRID").display).toBe("GRID")
    expect(categories(null).display).toBe("GRID")
  })

  it("sends the format the sheet holds, with the columns", () => {
    const form = { ...categories("GRID"), display: "RAIL" as const, columns: 4 }

    expect(toPayload(form, "link")).toMatchObject({ display: "RAIL", columns: 4 })
  })
})

describe("component-form-values — a showcase", () => {
  const PICK = { id: "a", productId: "0199e000-0000-7000-8000-000000000001" }
  const showcase = (over: Parameters<typeof component>[0] = {}) =>
    toForm(component({ kind: "PRODUCTS", title: null, display: "RAIL", source: "ALL", items: [], ...over }), null)

  it("opens on the source, the category, the pick, the shape and the limit it has", () => {
    const form = showcase({ source: "SELECTION", items: [PICK], display: "GRID", limit: 12 })

    expect(form).toMatchObject({ source: "SELECTION", picks: [PICK], display: "GRID", limit: "12", sourceCategoryId: "" })
    expect(showcase({ limit: null, display: null })).toMatchObject({ limit: "", display: "RAIL", source: "ALL" })
  })

  // What the source does not read stays in the form, for switching back, and never goes on the wire.
  it("sends the source with only what it reads", () => {
    const form = { ...showcase(), sourceCategoryId: "c1", picks: [PICK] }

    expect(toPayload({ ...form, source: "CATEGORY" }, "link")).toMatchObject({
      source: "CATEGORY",
      sourceCategoryId: "c1",
      items: [],
    })
    expect(toPayload({ ...form, source: "SELECTION" }, "link")).toMatchObject({
      source: "SELECTION",
      sourceCategoryId: null,
      items: [PICK],
    })
  })

  it("sends a blank limit as the default, and a typed one as a number", () => {
    expect(toPayload({ ...showcase(), limit: "" }, "link")).toMatchObject({ limit: null })
    expect(toPayload({ ...showcase(), limit: " 8 " }, "link")).toMatchObject({ limit: 8, display: "RAIL" })
  })
})
