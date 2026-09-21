// Libs
import { describe, expect, it } from "vitest"

// Lib
import { centsFrom, reaisFrom } from "./money"

describe("centsFrom", () => {
  /**
   * The legacy kept reais, cents and "R$ 25,00" in one column and chose between them with
   * `if (price < 1000)`. That is how a product could be sold for a hundredth of its price, and it
   * is why every one of these cases is written down rather than assumed.
   */
  it.each([
    ["139,90", 13990],
    ["139.90", 13990],
    ["R$ 139,90", 13990],
    ["  139,9  ", 13990],
    ["139", 13900],
    ["0,99", 99],
    ["1.234,56", 123456],
    ["1,234.56", 123456],
  ])("reads %s as %i cents", (typed, cents) => {
    expect(centsFrom(typed)).toBe(cents)
  })

  /** A field labelled in reais takes reais: 1390 is one thousand three hundred and ninety. */
  it("never guesses that a large number was already cents", () => {
    expect(centsFrom("1390")).toBe(139000)
  })

  /** More than two decimals is a typo, not a third of a cent. */
  it("keeps two decimal places and drops the rest", () => {
    expect(centsFrom("10,999")).toBe(1099)
  })

  it.each(["", "   ", "abc", "R$"])("answers null for %o rather than guessing", (typed) => {
    expect(centsFrom(typed)).toBeNull()
  })
})

describe("reaisFrom", () => {
  it("shows both decimal places, so an empty cents place is not lost", () => {
    expect(reaisFrom(13900)).toBe("139,00")
    expect(reaisFrom(99)).toBe("0,99")
  })

  it("shows nothing for a price that is not set", () => {
    expect(reaisFrom(null)).toBe("")
    expect(reaisFrom(undefined)).toBe("")
  })

  it("round-trips what a person typed", () => {
    expect(reaisFrom(centsFrom("1.234,56"))).toBe("1234,56")
  })
})
