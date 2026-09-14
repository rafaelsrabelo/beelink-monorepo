// Libs
import { describe, expect, it } from "vitest"

// Locales
import { en } from "./en"
import { ptBR } from "./pt-BR"

/** Every leaf of a message dictionary, as `login.title`-style paths. */
function paths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    paths(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe("message dictionaries", () => {
  it("carry exactly the same keys, so no screen falls back to another language", () => {
    expect(paths(en)).toEqual(paths(ptBR))
  })

  it("has no empty sentence in either language", () => {
    for (const [name, dictionary] of [["pt-BR", ptBR], ["en", en]] as const) {
      const empty = paths(dictionary).filter((path) => {
        const value = path.split(".").reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], dictionary)
        return typeof value !== "string" || value.trim() === ""
      })

      expect(empty, `${name} has empty entries`).toEqual([])
    }
  })

  it("does not ship one language's text inside the other", () => {
    expect(ptBR.login.submit).not.toBe(en.login.submit)
    expect(ptBR.verifyEmail.verifiedTitle).not.toBe(en.verifyEmail.verifiedTitle)
  })
})
