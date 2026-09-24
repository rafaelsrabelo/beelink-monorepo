// Libs
import { describe, expect, it } from "vitest"

// Block
import { en } from "../../locales/en"
import { ptBR } from "../../locales/pt-BR"
import { bandLabelOf } from "./band-label"

describe("bandLabelOf", () => {
  it("calls a named band by its name, and an unnamed one by its place", () => {
    expect(bandLabelOf("HERO SECTION", 2, ptBR)).toBe("HERO SECTION")
    expect(bandLabelOf(null, 2, ptBR)).toBe("Faixa 2")
    expect(bandLabelOf("   ", 3, en)).toBe("Band 3")
  })
})
