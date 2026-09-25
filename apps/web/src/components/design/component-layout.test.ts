// Libs
import { describe, expect, it } from "vitest"

// App
import { displayOf, heldLayoutOf, layoutOf, sameLayout } from "./component-layout"

const heading = { kind: "HEADING" as const, span: "FULL" as const, display: null, columns: null, align: null }

describe("component-layout — how a block sits, held and drawn", () => {
  // Each kind's own habit for a null, as the storefront draws it.
  it("draws a null format as the kind does, and none on a kind without one", () => {
    expect(displayOf("BANNER", null)).toBe("CAROUSEL")
    expect(displayOf("CATEGORIES", null)).toBe("GRID")
    expect(displayOf("PRODUCTS", null)).toBe("RAIL")
    expect(displayOf("TEXT", "GRID")).toBeNull()
  })

  it("shows the Layout tab every null resolved", () => {
    expect(layoutOf(heading)).toEqual({ span: "FULL", display: null, columns: 0, align: "CENTER" })
  })

  it("compares as drawn, so choosing back what a null drew is the same layout", () => {
    expect(sameLayout(heading, { ...heading, align: "CENTER" })).toBe(true)
    expect(sameLayout(heading, { ...heading, align: "LEFT" })).toBe(false)
  })

  // "Automático" is the grid deciding, which the API holds as null.
  it("holds a Layout change as the draft does, automatic columns as null", () => {
    expect(heldLayoutOf({ columns: 0 })).toEqual({ columns: null })
    expect(heldLayoutOf({ columns: 4, display: "GRID" })).toEqual({ columns: 4, display: "GRID" })
    expect(heldLayoutOf({ span: "HALF" })).toEqual({ span: "HALF" })
  })
})
