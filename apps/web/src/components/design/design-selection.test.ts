// Libs
import { describe, expect, it } from "vitest"

// App
import { toDraft } from "./design-draft"
import { component, saved, section } from "./design-draft.fixtures"
import { editedOf, targetOf } from "./design-selection"

// Band "a" holds one banner; band "b" holds a heading and a showcase.
const rows = saved.map(toDraft)

describe("targetOf — what a selection acts on", () => {
  // As the structure's card does: a lone block's handle, eye and bin are its band's.
  it("makes a block alone in its band act as its band, whether the block or the band was chosen", () => {
    expect(targetOf({ level: "block", id: "a1" }, rows)).toEqual({ level: "band", id: "a", blockId: "a1" })
    expect(targetOf({ level: "band", id: "a" }, rows)).toEqual({ level: "band", id: "a", blockId: "a1" })
  })

  it("tells a block of several from their band, chosen by its header", () => {
    expect(targetOf({ level: "block", id: "b2" }, rows)).toEqual({ level: "block", id: "b2", sectionId: "b" })
    expect(targetOf({ level: "band", id: "b" }, rows)).toEqual({ level: "band", id: "b", blockId: null })
  })

  // Moved beside the block above, the block is still what is chosen — in its new band.
  it("follows a block into the band it was moved to, and lets go of one that is gone", () => {
    const moved = [...rows.slice(0, 1), toDraft(section("b", [component("b1"), component("b2"), component("c1")])), ...rows.slice(2)]

    expect(targetOf({ level: "block", id: "c1" }, moved)).toEqual({ level: "block", id: "c1", sectionId: "b" })
    expect(targetOf({ level: "block", id: "ghost" }, rows)).toBeNull()
    expect(targetOf(null, rows)).toBeNull()
  })
})

describe("editedOf — the band and the block a panel edits", () => {
  it("edits a lone block's band with it, and a band chosen on its own without one", () => {
    expect(editedOf({ level: "band", id: "a", blockId: "a1" })).toEqual({ sectionId: "a", componentId: "a1" })
    expect(editedOf({ level: "band", id: "b", blockId: null })).toEqual({ sectionId: "b", componentId: null })
    expect(editedOf({ level: "block", id: "b2", sectionId: "b" })).toEqual({ sectionId: "b", componentId: "b2" })
    expect(editedOf(null)).toBeNull()
  })
})
