// Libs
import { describe, expect, it } from "vitest"

// App
import { toDraft } from "./design-draft"
import { component, saved, section } from "./design-draft.fixtures"
import { blockKeysOf, editedOf, movedBy, neighbourOf, nodesOf, targetOf } from "./design-selection"

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

describe("nodesOf — the stops the editor's ↑↓ walk", () => {
  // As the structure lists them: a lone block's card is one row, a band of several is its header and its blocks.
  it("walks the bands and their blocks in the structure's order, a lone block as its band", () => {
    expect(nodesOf(rows).map((node) => node.key)).toEqual(["a", "b", "b1", "b2", "c"])
    expect(nodesOf(rows)[0]?.selection).toEqual({ level: "block", id: "a1" })
    expect(nodesOf(rows)[1]?.selection).toEqual({ level: "band", id: "b" })
  })

  // Hidden things are in the structure, and the keys reach them there to show them again.
  it("keeps hidden bands and blocks", () => {
    const hidden = rows.map((row) => ({ ...row, isActive: false }))

    expect(nodesOf(hidden)).toHaveLength(5)
  })

  it("keys a block the way its stop is keyed: its band's when it is alone there", () => {
    const keyOf = blockKeysOf(rows)

    expect([keyOf("a1"), keyOf("b1"), keyOf("c1")]).toEqual(["a", "b1", "c"])
  })
})

describe("neighbourOf", () => {
  const nodes = nodesOf(rows)

  it("steps to the stop before or after, and stops at either end", () => {
    expect(neighbourOf(nodes, "b", 1)?.key).toBe("b1")
    expect(neighbourOf(nodes, "b", -1)?.key).toBe("a")
    expect(neighbourOf(nodes, "c", 1)).toBeNull()
    expect(neighbourOf(nodes, "a", -1)).toBeNull()
  })

  it("starts from an end when nothing is chosen", () => {
    expect(neighbourOf(nodes, null, 1)?.key).toBe("a")
    expect(neighbourOf(nodes, null, -1)?.key).toBe("c")
  })
})

describe("movedBy — Subir and Descer", () => {
  it("moves a band one place, a lone block's with it, and says where it landed", () => {
    const moved = movedBy(rows, { level: "band", id: "a", blockId: "a1" }, 1)

    expect(moved?.rows.map((row) => row.id)).toEqual(["b", "a", "c"])
    expect(moved?.position).toBe(2)
  })

  it("moves a block within its band, leaving the bands where they are", () => {
    const moved = movedBy(rows, { level: "block", id: "b2", sectionId: "b" }, -1)

    expect(moved?.rows.map((row) => row.id)).toEqual(["a", "b", "c"])
    expect(moved?.rows[1]?.components.map((component) => component.id)).toEqual(["b2", "b1"])
    expect(moved?.position).toBe(1)
  })

  // Into the next band is the structure's drag, which writes at once; the bar's is a draft step.
  it("goes nowhere past an end, the band's for a block", () => {
    expect(movedBy(rows, { level: "band", id: "a", blockId: "a1" }, -1)).toBeNull()
    expect(movedBy(rows, { level: "band", id: "c", blockId: "c1" }, 1)).toBeNull()
    expect(movedBy(rows, { level: "block", id: "b2", sectionId: "b" }, 1)).toBeNull()
  })
})
