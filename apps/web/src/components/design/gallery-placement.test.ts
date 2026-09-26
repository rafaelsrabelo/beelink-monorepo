// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { toDraft } from "./design-draft"
import { component, saved, section } from "./design-draft.fixtures"
import { placementOf } from "./gallery-placement"

// Band "a" holds one banner (titled "a1"); band "b" a heading and a showcase; band "c" the promises.
const rows = saved.map(toDraft)
const said = (at: Parameters<typeof placementOf>[0], page = saved) => placementOf(at, page.map(toDraft), page, ptBR)

describe("placementOf — where the section goes, in words", () => {
  // A band with one block is called by the block; one of several, by its place.
  it("names the bands on each side of a '+' between them", () => {
    expect(said({ level: "band", index: 1 })).toBe("Entra entre a1 e Faixa 2.")
    expect(said({ level: "band", index: 2 })).toBe("Entra entre Faixa 2 e c1.")
  })

  it("says the top, the end and an empty page", () => {
    expect(said({ level: "band", index: 0 })).toBe("Entra no começo da página, antes de a1.")
    expect(said({ level: "band", index: rows.length })).toBe("Entra no fim da página, depois de c1.")
    expect(said({ level: "band", index: 0 }, [])).toBe("É a primeira seção da página.")
  })

  it("calls a named band by its name", () => {
    const named = [section("n", [component("n1"), component("n2")], { name: "Destaques" }), ...saved]

    expect(said({ level: "band", index: 1 }, named)).toBe("Entra entre Destaques e a1.")
  })

  it("says the block it follows inside a band, or the band's start", () => {
    expect(said({ level: "block", sectionId: "b", index: 1 })).toBe("Entra em Faixa 2, depois de b1.")
    expect(said({ level: "block", sectionId: "b", index: 0 })).toBe("Entra no começo de Faixa 2.")
  })

  it("says what it goes beside", () => {
    expect(said({ level: "beside", sectionId: "b", afterId: "b1", span: "HALF", rebalance: [] })).toBe("Entra ao lado de b1.")
  })

  it("says nothing while no '+' is open", () => {
    expect(placementOf(null, rows, saved, ptBR)).toBeUndefined()
  })
})
