// Libs
import { describe, expect, it } from "vitest"

// Lib
import { optionCountOf } from "./option-count"

const says = (name: string, valueCount = 4, locale = "pt-BR") => optionCountOf({ name, valueCount }, locale)

describe("optionCountOf", () => {
  it("says the count and the option's name in the plural, as a sentence says it", () => {
    expect(says("Sabor")).toBe("4 sabores")
    expect(says("Cor", 3)).toBe("3 cores")
    expect(says("Tamanho", 5)).toBe("5 tamanhos")
    expect(says("Versão", 2)).toBe("2 versões")
    expect(says("Material", 2)).toBe("2 materiais")
    expect(says("Modelo", 6)).toBe("6 modelos")
  })

  it("puts only the first word in the plural, and keeps a word that is not merely capitalized", () => {
    expect(says("Tamanho do copo", 3)).toBe("3 tamanhos do copo")
    expect(says("GB", 3)).toBe("3 GBs")
  })

  it("says nothing for an option with a single value, or none", () => {
    expect(says("Sabor", 1)).toBeNull()
    expect(optionCountOf(null, "pt-BR")).toBeNull()
    expect(says("  ", 4)).toBeNull()
  })

  it("follows English's rules in English", () => {
    expect(says("Flavor", 4, "en")).toBe("4 flavors")
    expect(says("Capacity", 2, "en")).toBe("2 capacities")
  })
})
