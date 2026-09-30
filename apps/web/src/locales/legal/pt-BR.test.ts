// Libs
import { describe, expect, it } from "vitest"

// App
import { legalTexts } from "./pt-BR"

const documents = [legalTexts.terms, legalTexts.privacy]

describe("bee-link's legal texts (BEELINK-171)", () => {
  it("are written in Portuguese, the language that binds, and say so", () => {
    for (const document of documents) expect(document.lang).toBe("pt-BR")
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

  it("say, in the terms and the policy alike, the three moments an account accepts them", () => {
    expect(legalTexts.terms.intro.join(" ")).toMatch(/Continuar com Google[\s\S]*define uma senha pelo link/)
    expect(legalTexts.privacy.intro.join(" ")).toMatch(/criar uma conta, ou ao definir uma senha pelo link/)
  })
})
