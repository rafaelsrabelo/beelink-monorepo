// Libs
import { describe, expect, it } from "vitest"

// Types
import type { ShippingOption, ShippingQuote } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { checkoutShippingOf } from "./checkout-shipping"

const text = ptBR.storefront
const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
const pickup: ShippingOption = { kind: "PICKUP", carrier: null, feeCents: 0, window: null, freeAbove: false }
const own = (patch: Partial<ShippingOption> = {}): ShippingOption => ({ kind: "OWN_DELIVERY", carrier: null, feeCents: 500, window: { unit: "MINUTES", from: 30, to: 50 }, freeAbove: false, ...patch })
const quote = (patch: Partial<ShippingQuote>): ShippingQuote => ({ options: [own(), pickup], ownDelivery: { status: "QUOTED", distanceMeters: 2603 }, carriers: { status: "OFF" }, productsCents: 5000, ...patch })
const said = (patch: Partial<ShippingQuote>) => checkoutShippingOf(quote(patch), money, "pt-BR", text)

describe("the shop's quote as the checkout says it (BEELINK-178)", () => {
  it("says the fee and the window of the shop's own delivery", () => {
    expect(said({})).toEqual({ delivery: true, pickup: true, deliveryNote: "R$ 5,00 · chega em 30–50 min depois de sair da loja", unreachable: false })
  })

  it("says a free delivery, and when it is free because of what the cart adds up to", () => {
    expect(said({ options: [own({ feeCents: 0 }), pickup] })?.deliveryNote).toBe("Entrega grátis · chega em 30–50 min depois de sair da loja")
    expect(said({ options: [own({ feeCents: 0, freeAbove: true }), pickup] })?.deliveryNote).toBe("Frete grátis nesta compra · chega em 30–50 min depois de sair da loja")
  })

  it("keeps to a fee agreed afterwards where the shop quoted none", () => {
    expect(said({ options: [own({ feeCents: null, window: null }), pickup], ownDelivery: { status: "AGREE_LATER", reason: "NO_BANDS" } })?.deliveryNote).toBe(text.checkoutFeeLater)
  })

  it("says the shop does not go there, how far the address is, and what is left to choose", () => {
    const out = { ownDelivery: { status: "OUT_OF_RANGE", distanceMeters: 10828, radiusMeters: 8000 } } as const

    expect(said({ ...out, options: [pickup] })).toEqual({
      delivery: true,
      pickup: true,
      deliveryNote: "A loja não entrega neste endereço: ele fica a 10,8 km, e a entrega vai até 8 km. Escolha outro endereço ou retire na loja.",
      unreachable: true,
    })
    expect(said({ ...out, options: [] })?.deliveryNote).toMatch(/Escolha outro endereço\.$/)
  })

  it("offers only the ways the shop switched on", () => {
    expect(said({ options: [pickup], ownDelivery: { status: "OFF" } })).toMatchObject({ delivery: false, pickup: true })
    expect(said({ options: [own()] })).toMatchObject({ delivery: true, pickup: false })
  })

  it("says nothing while there is no quote: both ways stand, as before there were rules", () => {
    expect(checkoutShippingOf(null, money, "pt-BR", text)).toBeNull()
  })
})
