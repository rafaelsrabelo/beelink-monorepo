// Libs
import { describe, expect, it } from "vitest"

// Types
import type { PageProblem, Section } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { namedProblems } from "./page-problems"

const saved = [
  { id: "b1", name: null, components: [{ id: "c1", kind: "BANNER", title: null }] },
  { id: "b2", name: "Destaques", components: [{ id: "c2", kind: "PRODUCTS", title: "Mais vendidos" }] },
] as unknown as Section[]

const problem = (over: Partial<PageProblem>): PageProblem => ({ kind: "SHOWCASE_EMPTY", sectionId: "b2", componentId: "c2", itemId: null, ...over })

describe("namedProblems", () => {
  it("names a problem by its block's title and its band's name", () => {
    expect(namedProblems([problem({})], saved, ptBR)).toEqual([{ kind: "SHOWCASE_EMPTY", blockName: "Mais vendidos", bandName: "Destaques" }])
  })

  it("falls back to the kind's word and the band's place on the page, as the structure column does", () => {
    const [named] = namedProblems([problem({ kind: "BANNER_WITHOUT_IMAGE", sectionId: "b1", componentId: "c1" })], saved, ptBR)

    expect(named).toEqual({ kind: "BANNER_WITHOUT_IMAGE", blockName: ptBR.design.kinds.BANNER, bandName: "Faixa 1" })
  })

  // The list was read before the draft that names it: the sentence still has to be sayable.
  it("still names a problem whose block the draft read here does not hold", () => {
    const [named] = namedProblems([problem({ sectionId: "gone", componentId: "gone" })], saved, ptBR)

    expect(named?.blockName).toBe("—")
    expect(named?.kind).toBe("SHOWCASE_EMPTY")
  })
})
