// Libs
import { describe, expect, it } from "vitest"

// App
import { installmentTermsOf } from "./storefront-installments"

const ONLINE = { pix: true, card: true, maxInstallments: 6, minimumChargeCents: 500, minimumInstallmentCents: 500 }

describe("installmentTermsOf", () => {
  it("is the shop's card terms when it splits a payment", () => {
    expect(installmentTermsOf({ online: ONLINE, offline: true })).toEqual({ maxInstallments: 6, minimumChargeCents: 500, minimumInstallmentCents: 500 })
  })

  it("is nothing for a shop that charges no card online, or in full only", () => {
    expect(installmentTermsOf({ online: null, offline: true })).toBeUndefined()
    expect(installmentTermsOf({ online: { ...ONLINE, card: false }, offline: true })).toBeUndefined()
    expect(installmentTermsOf({ online: { ...ONLINE, maxInstallments: 1 }, offline: true })).toBeUndefined()
  })
})
