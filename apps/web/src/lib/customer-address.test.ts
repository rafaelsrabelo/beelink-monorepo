// Libs
import { describe, expect, it } from "vitest"

// App
import { addressLineOf, addressShortOf, zipCodeOf } from "./customer-address"

const address = { zipCode: "01310-930", street: "Av. Paulista", number: "1000", complement: "apto 12", neighborhood: "Bela Vista", city: "São Paulo", state: "SP" }
const nothing = { zipCode: null, street: null, number: null, complement: null, neighborhood: null, city: null, state: null }

describe("a customer's address on one line", () => {
  it("writes every part on file in full, and the street and the city in short", () => {
    expect(addressLineOf(address)).toBe("Av. Paulista, 1000, apto 12 — Bela Vista — São Paulo/SP — CEP 01310-930")
    expect(addressShortOf(address)).toBe("Av. Paulista, 1000, apto 12 — São Paulo/SP")
  })

  it("leaves out what is not on file, and is null with nothing", () => {
    expect(addressShortOf({ ...nothing, street: "Rua A", city: "Fortaleza" })).toBe("Rua A — Fortaleza")
    expect(addressShortOf(nothing)).toBeNull()
    expect(addressLineOf(nothing)).toBeNull()
  })

  it("writes a bare CEP with its dash, and leaves anything else as it came", () => {
    expect(zipCodeOf("60323231")).toBe("60323-231")
    expect(zipCodeOf("60323-231")).toBe("60323-231")
    expect(zipCodeOf("123")).toBe("123")
    expect(zipCodeOf(null)).toBeNull()
  })
})
