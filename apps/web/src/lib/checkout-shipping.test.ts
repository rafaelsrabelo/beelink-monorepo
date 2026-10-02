// Libs
import { describe, expect, it } from "vitest"

// Types
import type { ShippingOption, ShippingQuote } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { checkoutShippingOf, shippingChoiceOf } from "./checkout-shipping"

const text = ptBR.storefront
const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
const pickup: ShippingOption = { kind: "PICKUP", carrier: null, feeCents: 0, window: null, freeAbove: false }
const own = (patch: Partial<ShippingOption> = {}): ShippingOption => ({ kind: "OWN_DELIVERY", carrier: null, feeCents: 500, window: { unit: "MINUTES", from: 30, to: 50 }, freeAbove: false, ...patch })
const sedex: ShippingOption = { kind: "CARRIER", carrier: { serviceId: 2, service: "SEDEX", company: "Correios" }, feeCents: 2745, window: { unit: "BUSINESS_DAYS", from: 3, to: 4 }, freeAbove: false }
const pac: ShippingOption = { kind: "CARRIER", carrier: { serviceId: 1, service: "PAC", company: "Correios" }, feeCents: 1820, window: { unit: "BUSINESS_DAYS", from: 7, to: 9 }, freeAbove: false }
const quote = (patch: Partial<ShippingQuote>): ShippingQuote => ({ options: [own(), pickup], ownDelivery: { status: "QUOTED", distanceMeters: 2603 }, carriers: { status: "OFF" }, productsCents: 5000, ...patch })
const said = (patch: Partial<ShippingQuote>) => checkoutShippingOf(quote(patch), money, "pt-BR", text)

describe("the shop's quote as the checkout says it (BEELINK-178)", () => {
  it("says the fee and the window of the shop's own delivery, the one way there is", () => {
    const note = "R$ 5,00 · chega em 30–50 min depois de sair da loja"
    expect(said({})).toEqual({ delivery: true, pickup: true, ways: [{ id: "OWN", title: "Entrega da loja", detail: note }], note })
  })

  it("says a free delivery, and when it is free because of what the cart adds up to", () => {
    expect(said({ options: [own({ feeCents: 0 }), pickup] })?.note).toBe("Entrega grátis · chega em 30–50 min depois de sair da loja")
    expect(said({ options: [own({ feeCents: 0, freeAbove: true }), pickup] })?.note).toBe("Frete grátis nesta compra · chega em 30–50 min depois de sair da loja")
  })

  it("keeps to a fee agreed afterwards where the shop quoted none", () => {
    expect(said({ options: [own({ feeCents: null, window: null }), pickup], ownDelivery: { status: "AGREE_LATER", reason: "NO_BANDS" } })?.note).toBe(text.checkoutFeeLater)
  })

  it("says the shop does not go there, how far the address is, and what is left to choose", () => {
    const out = { ownDelivery: { status: "OUT_OF_RANGE", distanceMeters: 10828, radiusMeters: 8000 } } as const

    expect(said({ ...out, options: [pickup] })).toEqual({
      delivery: true,
      pickup: true,
      ways: [],
      note: "A loja não entrega neste endereço: ele fica a 10,8 km, e a entrega vai até 8 km. Escolha outro endereço ou retire na loja.",
    })
    expect(said({ ...out, options: [] })?.note).toMatch(/Escolha outro endereço\.$/)
  })

  it("offers only the ways the shop switched on", () => {
    expect(said({ options: [pickup], ownDelivery: { status: "OFF" } })).toMatchObject({ delivery: false, pickup: true, ways: [] })
    expect(said({ options: [own()] })).toMatchObject({ delivery: true, pickup: false })
  })

  it("says nothing while there is no quote: both ways stand, as before there were rules", () => {
    expect(checkoutShippingOf(null, money, "pt-BR", text)).toBeNull()
  })
})

describe("the carriers among the ways (BEELINK-186)", () => {
  const quoted = { carriers: { status: "QUOTED" } } as const

  it("lists the shop's own delivery and each carrier, with what it costs and its business days", () => {
    expect(said({ ...quoted, options: [own(), pac, sedex, pickup] })).toEqual({
      delivery: true,
      pickup: true,
      note: null,
      ways: [
        { id: "OWN", title: "Entrega da loja", detail: "R$ 5,00 · chega em 30–50 min depois de sair da loja" },
        { id: "CARRIER:1", title: "Correios · PAC", detail: "R$ 18,20 · chega em 7–9 dias úteis" },
        { id: "CARRIER:2", title: "Correios · SEDEX", detail: "R$ 27,45 · chega em 3–4 dias úteis" },
      ],
    })
  })

  it("still offers the carriers to an address past the shop's own radius", () => {
    const beyond = said({ ...quoted, options: [sedex, pickup], ownDelivery: { status: "OUT_OF_RANGE", distanceMeters: 10828, radiusMeters: 8000 } })

    expect(beyond).toMatchObject({ delivery: true, ways: [{ id: "CARRIER:2" }], note: "Correios · SEDEX — R$ 27,45 · chega em 3–4 dias úteis" })
  })

  it("delivers by carrier alone for a shop that does not bring orders itself, and says so when none takes the cart", () => {
    const carriersOnly = { ...quoted, ownDelivery: { status: "OFF" } } as const

    expect(said({ ...carriersOnly, options: [pac, pickup] })).toMatchObject({ delivery: true, ways: [{ id: "CARRIER:1" }] })
    expect(said({ ...carriersOnly, options: [pickup] })).toMatchObject({ delivery: true, ways: [], note: "A loja não tem entrega para este endereço agora. Escolha outro endereço ou retire na loja." })
    expect(said({ ownDelivery: { status: "OFF" }, carriers: { status: "UNAVAILABLE" }, options: [pickup] })?.note).toMatch(/^A loja não tem entrega para este endereço agora\./)
  })

  it("reads the way picked as the order asks for it: a carrier by its service, the shop's own by nothing", () => {
    expect(shippingChoiceOf("CARRIER:2")).toEqual({ kind: "CARRIER", serviceId: 2 })
    expect(shippingChoiceOf("OWN")).toBeNull()
    expect(shippingChoiceOf(null)).toBeNull()
    expect(shippingChoiceOf("CARRIER:x")).toBeNull()
  })
})
