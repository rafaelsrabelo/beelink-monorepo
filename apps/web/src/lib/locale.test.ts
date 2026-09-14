// Libs
import { describe, expect, it } from "vitest"

// App
import { localeFromAcceptLanguage } from "./locale"

describe("localeFromAcceptLanguage", () => {
  it.each([
    ["pt-BR,pt;q=0.9,en;q=0.8", "pt-BR"],
    ["en-US,en;q=0.9", "en"],
    ["pt-PT", "pt-BR"],
    ["fr-FR,fr;q=0.9", "pt-BR"],
    [null, "pt-BR"],
    ["", "pt-BR"],
  ])("reads %s as %s", (header, expected) => {
    expect(localeFromAcceptLanguage(header)).toBe(expected)
  })

  it("respects the quality order rather than the written order", () => {
    expect(localeFromAcceptLanguage("de;q=0.2,en;q=0.9,pt;q=0.5")).toBe("en")
  })
})
