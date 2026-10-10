// Libs
import { describe, expect, it } from "vitest"

// Lib
import { installmentOf } from "./installments"

const TERMS = { maxInstallments: 6, minimumChargeCents: 500, minimumInstallmentCents: 500 }

describe("installmentOf", () => {
  it("splits a price as far as the shop takes", () => {
    expect(installmentOf(8990, TERMS)).toEqual({ count: 6, amountCents: 1498 })
  })

  it("stops where an instalment would go under the least", () => {
    expect(installmentOf(1690, TERMS)).toEqual({ count: 3, amountCents: 563 })
  })

  it("says nothing of a price paid in full only", () => {
    expect(installmentOf(990, TERMS)).toBeNull()
    expect(installmentOf(8990, { ...TERMS, maxInstallments: 1 })).toBeNull()
    expect(installmentOf(400, TERMS)).toBeNull()
  })
})
