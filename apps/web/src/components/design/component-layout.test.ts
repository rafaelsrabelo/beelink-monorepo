// Libs
import { describe, expect, it } from "vitest"

// App
import { displayOf, heldLayoutOf, layoutOf, sameLayout } from "./component-layout"

const heading = { kind: "HEADING" as const, span: "FULL" as const, display: null, columns: null, align: null, visibleOn: "ALL" as const, cardStyle: null }

describe("component-layout — how a block sits, held and drawn", () => {
  // Each kind's own habit for a null, as the storefront draws it.
  it("draws a null format as the kind does, and none on a kind without one", () => {
    expect(displayOf("BANNER", null)).toBe("CAROUSEL")
    expect(displayOf("CATEGORIES", null)).toBe("GRID")
    expect(displayOf("PRODUCTS", null)).toBe("RAIL")
    expect(displayOf("TEXT", "GRID")).toBeNull()
    // A kind with one layout draws it whatever the row holds.
    expect(displayOf("FAQ", null)).toBe("ACCORDION")
  })

  it("shows the Layout tab every null resolved", () => {
    expect(layoutOf(heading)).toEqual({ span: "FULL", display: null, columns: 0, align: "CENTER", visibleOn: "ALL", cardStyle: "PHOTO_WITH_NAME" })
  })

  // Unset benefits draw in a row, as "Em linha" does; an unset strip draws a way no layout repeats.
  it("reads unset benefits as Em linha, and leaves an unset strip unset", () => {
    expect(displayOf("BENEFITS", null)).toBe("INLINE")
    expect(displayOf("ANNOUNCEMENT", null)).toBeNull()
    expect(displayOf("ANNOUNCEMENT", "MARQUEE")).toBe("MARQUEE")
  })

  // Still where it fits and scrolling on a phone is not "Fixa": choosing Fixa is a change to publish.
  it("counts Fixa on an unset strip as a change", () => {
    const strip = { kind: "ANNOUNCEMENT" as const, span: "FULL" as const, display: null, columns: null, align: null, visibleOn: "ALL" as const, cardStyle: null }

    expect(sameLayout(strip, { ...strip, display: "STATIC" })).toBe(false)
  })

  it("compares as drawn, so choosing back what a null drew is the same layout", () => {
    expect(sameLayout(heading, { ...heading, align: "CENTER" })).toBe(true)
    expect(sameLayout(heading, { ...heading, align: "LEFT" })).toBe(false)
  })

  // Where it shows is the Layout tab's too, and waits for Publicar with the rest of it.
  it("tells a block kept for one screen from the same block everywhere", () => {
    expect(sameLayout(heading, { ...heading, visibleOn: "PHONE" })).toBe(false)
  })

  // BEELINK-308: a categories block saved before the choice draws the photo with its name.
  it("reads an unset card style as the photo with its name, and the artwork alone as a change", () => {
    const categories = { ...heading, kind: "CATEGORIES" as const, display: "RAIL" as const }

    expect(layoutOf(categories).cardStyle).toBe("PHOTO_WITH_NAME")
    expect(sameLayout(categories, { ...categories, cardStyle: "PHOTO_WITH_NAME" })).toBe(true)
    expect(sameLayout(categories, { ...categories, cardStyle: "ART_ONLY" })).toBe(false)
    expect(heldLayoutOf({ cardStyle: "ART_ONLY" })).toEqual({ cardStyle: "ART_ONLY" })
  })

  // "Automático" is the grid deciding, which the API holds as null.
  it("holds a Layout change as the draft does, automatic columns as null", () => {
    expect(heldLayoutOf({ columns: 0 })).toEqual({ columns: null })
    expect(heldLayoutOf({ columns: 4, display: "GRID" })).toEqual({ columns: 4, display: "GRID" })
    expect(heldLayoutOf({ span: "HALF" })).toEqual({ span: "HALF" })
  })
})
