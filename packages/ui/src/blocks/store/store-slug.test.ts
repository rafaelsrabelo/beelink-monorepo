// Libs
import { describe, expect, it } from "vitest"

// Block
import { slugify } from "./store-slug"

describe("slugify", () => {
  it("folds accents instead of dropping the letter they sit on", () => {
    expect(slugify("Cantina do Zé")).toBe("cantina-do-ze")
    expect(slugify("Ação & Cia")).toBe("acao-cia")
  })

  it("collapses every run of punctuation and space into one hyphen", () => {
    expect(slugify("Doces   da  Ana!!!")).toBe("doces-da-ana")
    expect(slugify("Pizza -- Forno")).toBe("pizza-forno")
  })

  it("leaves no hyphen at either end, which the slug pattern refuses", () => {
    expect(slugify("  Padaria  ")).toBe("padaria")
    expect(slugify("--Café--")).toBe("cafe")
  })

  it("returns an empty slug rather than inventing one, so the schema can refuse it", () => {
    expect(slugify("!!!")).toBe("")
    expect(slugify("")).toBe("")
  })

  it("keeps digits, which a shop name often ends in", () => {
    expect(slugify("Loja 24 Horas")).toBe("loja-24-horas")
  })
})
