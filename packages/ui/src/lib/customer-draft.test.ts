// Libs
import { describe, expect, it } from "vitest"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// Lib
import { customerDraftIssuesOf } from "./customer-draft"
import type { OrderCustomerDraft } from "./order-form"

const text = ptBR.orders.form
const address = { zipCode: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" }
const draft = (over: Partial<OrderCustomerDraft> = {}): OrderCustomerDraft => ({ name: "Bia Souza", phone: "(11) 98888-7777", address, ...over })

describe("customerDraftIssuesOf", () => {
  it("takes a name, a phone with its area code, and an address left blank", () => {
    expect(customerDraftIssuesOf(draft(), text)).toEqual({})
  })

  it("points at a short name, a phone without its area code, a malformed CEP and a UF that is not two letters", () => {
    expect(customerDraftIssuesOf(draft({ name: " B ", phone: "98888-7777", address: { ...address, zipCode: "0131", state: "São" } }), text)).toEqual({
      name: text.customerNameInvalid,
      phone: text.customerPhoneInvalid,
      zipCode: text.zipCodeInvalid,
      state: text.stateInvalid,
    })
  })

  it("refuses a blank phone when one is required, and lets a record without one keep none", () => {
    expect(customerDraftIssuesOf(draft({ phone: "  " }), text).phone).toBe(text.customerPhoneInvalid)
    expect(customerDraftIssuesOf(draft({ phone: "" }), text, { phoneRequired: false })).toEqual({})
    // Something typed is checked either way.
    expect(customerDraftIssuesOf(draft({ phone: "abc" }), text, { phoneRequired: false }).phone).toBe(text.customerPhoneInvalid)
  })
})
