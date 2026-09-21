// Libs
import { describe, expect, it } from "vitest"

// Locales
import { en } from "./en"
import { ptBR } from "./pt-BR"

/** The value at a `login.title`-style path. */
function leafAt(dictionary: object, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], dictionary)
}

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
        const value = leafAt(dictionary, path)
        return typeof value !== "string" || value.trim() === ""
      })

      expect(empty, `${name} has empty entries`).toEqual([])
    }
  })

  /**
   * The invariant this package is built on, asserted rather than described.
   *
   * A dictionary is handed to a Client Component as a prop, and React serialises every prop — so a
   * single function anywhere inside it fails the whole tree, on every page, not just the one that
   * reads the key. A parameterised sentence carries `{placeholders}` and is filled by `format()`.
   *
   * This test was once loosened to accept functions, to accommodate a mistake rather than catch
   * it, and the mistake reached the browser twice. `structuredClone` is the same algorithm React
   * uses to decide, so it is the thing to ask rather than a description of it.
   */
  it.each([["pt-BR", ptBR], ["en", en]] as const)(
    "%s is plain data, which is what lets it cross into a Client Component",
    (_name, dictionary) => {
      expect(() => structuredClone(dictionary)).not.toThrow()
    },
  )

  it.each([["pt-BR", ptBR], ["en", en]] as const)("%s holds sentences, never builders", (name, dictionary) => {
    const callable = paths(dictionary).filter((path) => typeof leafAt(dictionary, path) === "function")

    expect(callable, `${name} has function-valued messages`).toEqual([])
  })

  it("does not ship one language's text inside the other", () => {
    expect(ptBR.login.submit).not.toBe(en.login.submit)
    expect(ptBR.verifyEmail.verifiedTitle).not.toBe(en.verifyEmail.verifiedTitle)
  })
})
