// Libs
import { describe, expect, it } from "vitest"

// App
import { legalTexts } from "./pt-BR"

const documents = [legalTexts.terms, legalTexts.privacy]

describe("bee-link's legal texts (BEELINK-171)", () => {
  it("are written in Portuguese, the language that binds, and say so", () => {
    for (const document of documents) expect(document.lang).toBe("pt-BR")
  })

  // The API records `LegalVersion`; the page shows `effective`. This is what keeps the two one day.
  it("say they took effect on the day their version names", () => {
    const day = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${legalTexts.version}T00:00:00Z`))

    for (const document of documents) expect(document.effective).toBe(`Vigente desde ${day}`)
  })

  // The page keys each heading, paragraph and item by its text: a repeated one would be dropped.
  it("never repeat a heading, an intro paragraph or an item of one list", () => {
    for (const document of documents) {
      const headings = document.sections.map((section) => section.heading)
      expect(new Set(headings).size).toBe(headings.length)
      expect(new Set(document.intro).size).toBe(document.intro.length)
      for (const section of document.sections) {
        for (const block of section.blocks) {
          if (block.kind === "list") expect(new Set(block.items).size).toBe(block.items.length)
        }
      }
    }
  })

  /** BEELINK-244: cashback is the shop's credit, not money — and the shop keeps the balance and its statement. */
  it("say what cashback is and is not in the terms, and that the shop keeps it in the policy", () => {
    const cashback = legalTexts.terms.sections.find((section) => section.heading === "Cashback das lojas")
    const said = cashback?.blocks.map((block) => (block.kind === "paragraph" ? block.text : block.items.join(" "))).join(" ") ?? ""

    expect(said).toMatch(/crédito concedido pela loja, e não dinheiro/)
    expect(said).toMatch(/vale só na loja que o concedeu/)
    expect(said).toMatch(/não pode ser sacado, trocado por dinheiro nem transferido/)
    expect(said).toMatch(/vence e deixa de existir/)

    const kept = legalTexts.privacy.sections.find((section) => section.heading === "Dados dos clientes das lojas")
    expect(JSON.stringify(kept)).toMatch(/o seu cashback na loja[^"]*o saldo[^"]*o extrato/)
  })

  it("say, in the terms and the policy alike, the three moments an account accepts them", () => {
    expect(legalTexts.terms.intro.join(" ")).toMatch(/Continuar com Google[\s\S]*define uma senha pelo link/)
    expect(legalTexts.privacy.intro.join(" ")).toMatch(/criar uma conta, ou ao definir uma senha pelo link/)
  })
})
