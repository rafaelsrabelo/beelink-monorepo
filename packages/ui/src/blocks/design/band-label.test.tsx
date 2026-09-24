// Libs
import { describe, expect, it } from "vitest"

// Block
import { en } from "../../locales/en"
import { ptBR } from "../../locales/pt-BR"
import { bandAnnouncements, bandLabelOf } from "./band-label"

describe("bandLabelOf", () => {
  it("calls a named band by its name, and an unnamed one by its place", () => {
    expect(bandLabelOf("HERO SECTION", 2, ptBR)).toBe("HERO SECTION")
    expect(bandLabelOf(null, 2, ptBR)).toBe("Faixa 2")
    expect(bandLabelOf("   ", 3, en)).toBe("Band 3")
  })
})

describe("bandAnnouncements", () => {
  const bands = [
    { id: "a", name: "HERO SECTION" },
    { id: "b", name: null },
    { id: "c", name: "Serviços" },
  ]
  const drag = (id: string) => ({ id, data: { current: undefined }, rect: { current: { initial: null, translated: null } } })
  const over = (id: string) => ({ id, rect: { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 }, data: { current: undefined }, disabled: false })

  // A named band where the template promised a number read as "na posição Serviços".
  it("names the band moved, and the place it lands by its number", () => {
    const say = bandAnnouncements(bands, ptBR)

    expect(say.onDragStart({ active: drag("a") } as never)).toBe("Pegou HERO SECTION.")
    expect(say.onDragOver({ active: drag("a"), over: over("c") } as never)).toBe("HERO SECTION na posição 3.")
    expect(say.onDragEnd({ active: drag("b"), over: over("a") } as never)).toBe("Faixa 2 solto na posição 1.")
  })
})
