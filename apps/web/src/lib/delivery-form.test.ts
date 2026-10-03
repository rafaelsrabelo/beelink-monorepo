// Libs
import { describe, expect, it } from "vitest"

// Types
import type { DeliverySettings } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { deliveryCarriersOf, deliveryFormOf, deliveryPayloadOf, deliveryPreviewsOf, deliveryRadiusOf, pickupAddressOf } from "./delivery-form"

const text = ptBR.delivery
const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`

const SAVED: DeliverySettings = {
  pickupEnabled: true,
  ownDeliveryEnabled: true,
  bands: [
    { upToMeters: 3000, feeCents: 500, windowFromMinutes: 30, windowToMinutes: 50 },
    { upToMeters: 8500, feeCents: 0, windowFromMinutes: 40, windowToMinutes: 70 },
  ],
  radiusMeters: 8500,
  freeAboveCents: 15000,
  carriersEnabled: false,
  updatedAt: "2026-10-02T12:00:00.000Z",
}

describe("the Delivery tab and the wire (BEELINK-177)", () => {
  it("shows kilometres and reais, and takes them back as metres and cents", () => {
    const form = deliveryFormOf(SAVED)

    expect(form.bands[1]).toEqual({ upToKm: "8,5", fee: "0,00", windowFrom: "40", windowTo: "70" })
    expect(form.freeAbove).toBe("150,00")
    expect(deliveryPayloadOf(form, SAVED, text.issues)).toEqual({ payload: { pickupEnabled: true, ownDeliveryEnabled: true, carriersEnabled: false, bands: SAVED.bands, freeAboveCents: 15000 } })
  })

  it("reads a blank free-delivery amount as never", () => {
    const read = deliveryPayloadOf({ ...deliveryFormOf(SAVED), freeAbove: " " }, SAVED, text.issues)
    expect(read).toMatchObject({ payload: { freeAboveCents: null } })
  })

  it("says which row to correct, and why", () => {
    const form = deliveryFormOf(SAVED)
    const read = deliveryPayloadOf(
      {
        ...form,
        bands: [
          { upToKm: "5", fee: "5,00", windowFrom: "30", windowTo: "50" },
          { upToKm: "3", fee: "9,00", windowFrom: "40", windowTo: "70" },
          { upToKm: "9", fee: "", windowFrom: "40", windowTo: "70" },
          { upToKm: "201", fee: "9,00", windowFrom: "40", windowTo: "70" },
          { upToKm: "12", fee: "9,00", windowFrom: "90", windowTo: "70" },
        ],
        freeAbove: "0",
      },
      SAVED,
      text.issues,
    )

    expect(read).toEqual({
      issues: {
        bands: {
          1: "Faixa 2: a distância tem que ser maior que a da faixa 1.",
          2: "Faixa 3: preencha a distância, o frete e os dois tempos.",
          3: "Faixa 4: até 200 km, frete até R$ 1.000.000,00 e tempo até 10.080 min (7 dias).",
          4: "Faixa 5: o tempo final não pode ser menor que o inicial.",
        },
        freeAbove: "Informe um valor maior que zero, ou deixe vazio.",
      },
    })
  })

  it("sends back what was saved for the shop's own delivery while it is switched off, whatever is half-typed in it", () => {
    const read = deliveryPayloadOf({ ...deliveryFormOf(SAVED), ownDeliveryEnabled: false, bands: [{ upToKm: "x", fee: "", windowFrom: "", windowTo: "" }] }, SAVED, text.issues)

    expect(read).toEqual({ payload: { pickupEnabled: true, ownDeliveryEnabled: false, carriersEnabled: false, bands: SAVED.bands, freeAboveCents: 15000 } })
  })

  it("says each band in words once it reads, free as free, and draws the furthest one", () => {
    const form = { ...deliveryFormOf(SAVED), bands: [...deliveryFormOf(SAVED).bands, { upToKm: "abc", fee: "1", windowFrom: "1", windowTo: "2" }] }

    expect(deliveryPreviewsOf(form, money, text)).toEqual(["Até 3 km: R$ 5,00, chega em 30–50 min.", "Até 8,5 km: frete grátis, chega em 40–70 min.", null])
    expect(deliveryRadiusOf(form)).toBe(8500)
    expect(deliveryRadiusOf({ ...form, bands: [] })).toBeNull()
  })

  it("puts the shop's address on one line, or none while there is no street or city", () => {
    const address = { street: "Rua Augusta", number: "1500", complement: null, neighborhood: "Consolação", city: "São Paulo", state: "SP", zipCode: "01310930" }

    expect(pickupAddressOf(address)).toBe("Rua Augusta, 1500 — Consolação, São Paulo/SP")
    expect(pickupAddressOf({ ...address, street: null })).toBeNull()
  })

  it("reads the Melhor Envio connection for the carriers card", () => {
    const view = deliveryCarriersOf({ available: true, environment: "SANDBOX", status: "CONNECTED", account: { name: "Loja", email: null }, connectedAt: null, accessExpiresAt: null })
    expect(view).toEqual({ available: true, status: "CONNECTED", accountName: "Loja", sandbox: true })
  })
})
