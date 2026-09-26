// Libs
import { describe, expect, it } from "vitest"

// Types
import type { ComponentKind, PublicComponent, PublicSection } from "@harness-monorepo/contracts"

// App
import { reachesTheEdge, rhythmOf } from "./band-rhythm"

function block(kind: ComponentKind): PublicComponent {
  return {
    id: kind,
    kind,
    title: "x",
    subtitle: null,
    body: "x",
    span: "FULL",
    display: null,
    source: null,
    sourceCategory: null,
    items: [],
    columns: null,
    align: null,
  }
}

function band(kinds: ComponentKind[], width: PublicSection["width"] = "CONTAINED", background: string | null = null): PublicSection {
  return { id: kinds.join("-"), name: null, width, background, components: kinds.map(block) }
}

const cover = band(["BANNER"], "FULL")
const words = band(["HEADING"])
const strip = band(["TEXT"], "CONTAINED", "oklch(0.7 0.15 160)")

describe("rhythmOf — the page's one spacing", () => {
  it("puts 32px between two plain bands, and before the first one under the header", () => {
    expect(rhythmOf([words, words]).map((at) => at.spaceBefore)).toEqual([true, true])
  })

  // The owner's report: a cover meant to meet the header showed the page's colour around it.
  it("sits a cover flush under the header", () => {
    expect(rhythmOf([cover, words])[0]?.spaceBefore).toBe(false)
  })

  it("lets two surfaces meet — a cover and the coloured strip under it read as one", () => {
    expect(rhythmOf([cover, strip, cover]).map((at) => at.spaceBefore)).toEqual([false, false, false])
  })

  it("keeps 32px between a surface and a plain band, either way round", () => {
    expect(rhythmOf([cover, words, strip]).map((at) => at.spaceBefore)).toEqual([false, true, true])
  })

  it("does not count a band of words as a surface just because it reaches the edges", () => {
    expect(rhythmOf([band(["HEADING"], "FULL")])[0]?.spaceBefore).toBe(true)
  })

  it("counts the benefits strip, with its own tint, as a surface in an edge-to-edge band", () => {
    expect(rhythmOf([band(["BENEFITS"], "FULL")])[0]?.spaceBefore).toBe(false)
  })

  it("pads a coloured band of words with its own colour, and lets pictures fill a coloured band", () => {
    expect(rhythmOf([strip])[0]?.padded).toBe(true)
    expect(rhythmOf([band(["BANNER"], "FULL", "oklch(0.2 0 0)")])[0]?.padded).toBe(false)
    expect(rhythmOf([words])[0]?.padded).toBe(false)
  })

  it("tells pictures, which reach the edge, from words, which keep the margin", () => {
    expect(reachesTheEdge({ kind: "BANNER", display: "CAROUSEL" })).toBe(true)
    expect(reachesTheEdge({ kind: "BENEFITS", display: null })).toBe(true)
    expect(reachesTheEdge({ kind: "PRODUCTS", display: "RAIL" })).toBe(false)
    expect(reachesTheEdge({ kind: "HEADING", display: null })).toBe(false)
    // A call to action's strip is a surface of its own colour; its card sits inside the margins.
    expect(reachesTheEdge({ kind: "CALL_TO_ACTION", display: "BAND" })).toBe(true)
    expect(reachesTheEdge({ kind: "CALL_TO_ACTION", display: "CARD" })).toBe(false)
  })

  // Words beside a picture, and promises as cards, keep the page's margin and its spacing.
  it("keeps a banner Dividida and benefits as cards off the edge", () => {
    expect(reachesTheEdge({ kind: "BANNER", display: "SPLIT" })).toBe(false)
    expect(reachesTheEdge({ kind: "BENEFITS", display: "CARDS" })).toBe(false)
  })
})
