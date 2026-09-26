// Libs
import { describe, expect, it } from "vitest"

// Block
import { besideInBand, drawnOf } from "./band-beside"

describe("drawnOf — the blocks a computer's row holds", () => {
  // Rows are a computer's: a block kept for the phone takes no room beside the others there.
  it("leaves out a hidden block, the strip and a block kept for the phone", () => {
    const blocks = [
      { id: "a", kind: "BANNER" as const, span: "HALF" as const, isActive: true },
      { id: "b", kind: "BANNER" as const, span: "HALF" as const, isActive: true, visibleOn: "PHONE" as const },
      { id: "c", kind: "BANNER" as const, span: "HALF" as const, isActive: false },
      { id: "d", kind: "ANNOUNCEMENT" as const, span: "FULL" as const, isActive: true },
      { id: "e", kind: "TEXT" as const, span: "HALF" as const, isActive: true, visibleOn: "DESKTOP" as const },
    ]

    expect(drawnOf(blocks).map((block) => block.id)).toEqual(["a", "e"])
  })

  it("finds room beside a half whose neighbour shows only on the phone", () => {
    const blocks = [
      { id: "a", kind: "BANNER" as const, span: "HALF" as const, isActive: true },
      { id: "b", kind: "BANNER" as const, span: "HALF" as const, isActive: true, visibleOn: "PHONE" as const },
    ]

    expect(besideInBand(blocks, "a")).toMatchObject({ afterId: "a", span: "HALF" })
  })
})
