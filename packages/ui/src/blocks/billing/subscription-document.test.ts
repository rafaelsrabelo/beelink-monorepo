// Libs
import { describe, expect, it } from "vitest"

// UI
import { periodFiguresOf } from "@harness-monorepo/ui/lib/plan-figures"

// Block
import { TYPED_CNPJ, TYPED_CPF } from "./billing.fixtures"
import { isBillingName, isCnpj, isCpfOrCnpj, maskDocument } from "./subscription-document"

describe("maskDocument", () => {
  it.each([
    ["5", "5"],
    ["529", "529"],
    ["5299", "529.9"],
    ["529982247", "529.982.247"],
    ["5299822472", "529.982.247-2"],
    ["52998224725", "529.982.247-25"],
    // A twelfth digit makes it a CNPJ, and the shape follows.
    ["112223330001", "11.222.333/0001"],
    ["1122233300018", "11.222.333/0001-8"],
    ["11222333000181", "11.222.333/0001-81"],
  ])("writes %s as %s, a CPF's shape until it is longer than one", (typed, masked) => {
    expect(maskDocument(typed)).toBe(masked)
  })

  it("reads only the digits of what was pasted, and leaves out what comes past fourteen", () => {
    expect(maskDocument(" 11.222.333/0001-81 ")).toBe("11.222.333/0001-81")
    expect(maskDocument("112223330001819")).toBe("11.222.333/0001-81")
    expect(maskDocument("abc")).toBe("")
  })

  it("never ends in punctuation, so a backspace always takes a digit", () => {
    for (let length = 1; length <= 14; length += 1) expect(maskDocument(TYPED_CNPJ.slice(0, length))).toMatch(/\d$/)
  })
})

describe("isCpfOrCnpj, the API's rule restated", () => {
  it("takes a CPF and a CNPJ whose check digits hold, written with their punctuation or without", () => {
    for (const document of [TYPED_CPF, "529.982.247-25", TYPED_CNPJ, "11.222.333/0001-81"]) expect(isCpfOrCnpj(document)).toBe(true)
  })

  it.each([
    ["a check digit off", "52998224726"],
    ["a CNPJ's check digit off", "11222333000182"],
    ["one digit repeated", "11111111111"],
    ["a CNPJ of one digit repeated", "00000000000000"],
    ["too short", "5299822472"],
    ["between the two lengths", "529982247251"],
    ["a CNPJ with letters, which the API refuses still", "12ABC34501DE35"],
  ])("refuses %s", (_what, document) => {
    expect(isCpfOrCnpj(document)).toBe(false)
  })

  it("tells a CNPJ by its own check digits", () => {
    expect(isCnpj(TYPED_CNPJ)).toBe(true)
    expect(isCnpj(TYPED_CPF)).toBe(false)
  })

  /** A sum whose rest is under two makes a zero, not eleven less it: the one case the CNPJ above never meets. */
  it("takes a CNPJ whose check digit is a zero", () => {
    expect(isCnpj("11.222.333/1003-05")).toBe(true)
    expect(isCnpj("11.222.333/1003-15")).toBe(false)
  })
})

describe("isBillingName", () => {
  it("counts a name as the API keeps it: trimmed, a run of spaces as one, in code points", () => {
    expect(isBillingName("  Ana  ")).toBe(true)
    expect(isBillingName("A")).toBe(false)
    expect(isBillingName("  A  ")).toBe(false)
    expect(isBillingName("x".repeat(120))).toBe(true)
    expect(isBillingName("x".repeat(121))).toBe(false)
    // Two characters of UTF-16 each, one each as Postgres counts.
    expect(isBillingName("🐝".repeat(120))).toBe(true)
  })
})

describe("periodFiguresOf, shared with the landing", () => {
  it("works the month and the saving out of the whole price, never in its own favour", () => {
    expect(periodFiguresOf(10000, 1, 10000)).toEqual({ monthlyCents: 10000, savingCents: 0, savingPercent: 0 })
    expect(periodFiguresOf(54000, 6, 10000)).toEqual({ monthlyCents: 9000, savingCents: 6000, savingPercent: 10 })
    // 431,99 over six months is 71,998… a month, and 9,89% under six months at 79,90.
    expect(periodFiguresOf(43199, 6, 7990)).toEqual({ monthlyCents: 7200, savingCents: 4741, savingPercent: 9 })
    expect(periodFiguresOf(95881, 12, 7990)).toEqual({ monthlyCents: 7991, savingCents: 0, savingPercent: 0 })
  })
})
