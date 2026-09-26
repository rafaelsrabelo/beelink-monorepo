// Libs
import { describe, expect, it } from "vitest"

// App
import { bandChanged, isStripBand, toBandForm, toBandPayload } from "./band-form-values"
import { component, section } from "./design-draft.fixtures"

const opened = toBandForm(section("b", [component("b1")], { name: "Destaques", background: "oklch(0.3 0.1 20)" }))

describe("band-form-values — Estilo between the wire and its tab", () => {
  it("opens on the band's nulls as empty strings", () => {
    expect(toBandForm(section("b", []))).toEqual({ name: "", width: "CONTAINED", background: "" })
  })

  // What the preview paints and Salvar sends: a value saved elsewhere meanwhile is not written back.
  it("sends only what changed since the tab opened, emptied values as null", () => {
    expect(toBandPayload({ ...opened, width: "FULL" }, opened)).toEqual({ width: "FULL" })
    expect(toBandPayload({ ...opened, name: "  ", background: "" }, opened)).toEqual({ name: null, background: null })
    expect(toBandPayload(opened, opened)).toEqual({})
  })

  it("says whether Salvar has a band to write", () => {
    expect(bandChanged(opened, opened)).toBe(false)
    expect(bandChanged({ ...opened, background: "" }, opened)).toBe(true)
  })

  it("knows the strip's band, and does not take an empty band for it", () => {
    expect(isStripBand(section("s", [component("s1", { kind: "ANNOUNCEMENT" })]))).toBe(true)
    expect(isStripBand(section("b", [component("b1")]))).toBe(false)
    expect(isStripBand(section("e", []))).toBe(false)
  })
})
