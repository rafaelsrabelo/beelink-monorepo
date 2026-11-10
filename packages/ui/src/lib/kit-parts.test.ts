// Libs
import { describe, expect, it } from "vitest"

// Lib
import { kitPartsTextOf } from "./kit-parts"

describe("kitPartsTextOf", () => {
  it("says what went in a kit in one line, in the order chosen", () => {
    expect(kitPartsTextOf([{ productName: "Ninho com Nutella", quantity: 3 }, { productName: "Paçoquinha", quantity: 2 }])).toBe("3× Ninho com Nutella · 2× Paçoquinha")
  })

  it("says nothing of a line that is no kit", () => {
    expect(kitPartsTextOf(undefined)).toBeNull()
    expect(kitPartsTextOf([])).toBeNull()
  })
})
