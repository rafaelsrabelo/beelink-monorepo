// Libs
import { describe, expect, it } from "vitest"

// Types
import type { OrderLabelOverview } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { labelCardViewOf, labelErrorOf, labelFormOf, labelPayloadOf } from "./order-label-form"

const text = ptBR.orders.label
const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
const context = { money, date: () => "02/10/2026", integrationsHref: "/admin/loja/integrations", storeHref: "/admin/loja/store" }
const overview: OrderLabelOverview = {
  label: null,
  blockers: [],
  carrier: { serviceId: 2, service: "SEDEX", company: "Correios" },
  suggestedVolume: { weightGrams: 600, lengthMm: 260, widthMm: 200, heightMm: 85 },
  balanceCents: 10000,
  walletUrl: "https://sandbox.melhorenvio.com.br",
}
const generated = { status: "GENERATED" as const, protocol: "ORD-1", priceCents: 2745, volume: { weightGrams: 650, lengthMm: 260, widthMm: 200, heightMm: 90 }, invoiceKey: null, trackingCode: "ME23002OWZ7BR", createdAt: "", paidAt: "", generatedAt: "", cancelledAt: null }

describe("an order's label as the card says it (BEELINK-187)", () => {
  it("says the carrier and the wallet, and starts the form from the box Melhor Envio worked out", () => {
    expect(labelCardViewOf(overview, text, context)).toEqual({ carrier: "Correios · SEDEX", blockers: [], balance: "R$ 100,00", label: null })
    expect(labelFormOf(overview)).toEqual({ weight: "600", length: "26", width: "20", height: "8,5", invoiceKey: "" })
  })

  it("says each blocker with where to fix it", () => {
    const blocked = labelCardViewOf({ ...overview, blockers: ["NO_SENDER_DOCUMENT", "NO_ORIGIN", "NO_RECIPIENT_DOCUMENT"] }, text, context)

    expect(blocked.blockers).toEqual([
      { text: text.blockers.NO_SENDER_DOCUMENT, href: "/admin/loja/integrations", linkLabel: "Abrir Integrações" },
      { text: text.blockers.NO_ORIGIN, href: "/admin/loja/store", linkLabel: "Abrir o endereço da loja" },
      { text: text.blockers.NO_RECIPIENT_DOCUMENT },
    ])
  })

  it("says a label's status with its price, and a cancelled one with its date", () => {
    expect(labelCardViewOf({ ...overview, label: generated }, text, context).label).toEqual({ status: "GENERATED", statusText: "Pronta para imprimir e postar. Custou R$ 27,45.", protocol: "ORD-1", trackingCode: "ME23002OWZ7BR" })
    expect(labelCardViewOf({ ...overview, label: { ...generated, status: "CANCELLED", cancelledAt: "2026-10-02T12:00:00.000Z" } }, text, context).label?.statusText).toBe("Cancelada em 02/10/2026. O valor volta à carteira em até 12 horas.")
  })

  it("starts from the box of a label still in the cart, and from the suggestion again after a cancellation", () => {
    expect(labelFormOf({ ...overview, label: { ...generated, status: "IN_CART", invoiceKey: "3".repeat(44) } })).toEqual({ weight: "650", length: "26", width: "20", height: "9", invoiceKey: "3".repeat(44) })
    expect(labelFormOf({ ...overview, label: { ...generated, status: "CANCELLED" } }).height).toBe("8,5")
  })

  it("reads the form as grams, millimetres and the key's digits — none is a declaration of contents", () => {
    expect(labelPayloadOf({ weight: "650", length: "26", width: "20", height: "8,5", invoiceKey: "" }, text.issues)).toEqual({ payload: { volume: { weightGrams: 650, lengthMm: 260, widthMm: 200, heightMm: 85 }, invoiceKey: null } })
    expect(labelPayloadOf({ weight: "650", length: "26", width: "20", height: "9", invoiceKey: "3516 0912 3456 7800 0123 5500 1000 0012 3410 0001 2345" }, text.issues)).toMatchObject({ payload: { invoiceKey: "35160912345678000123550010000012341000012345" } })
  })

  it.each([
    ["a box with a size missing", { height: "" }, { volume: text.issues.volume }],
    ["a box past the carriers", { weight: "30001" }, { volume: text.issues.volume }],
    ["a key short of 44 digits", { invoiceKey: "123" }, { invoiceKey: text.issues.invoiceKey }],
    ["a key of letters", { invoiceKey: "abc" }, { invoiceKey: text.issues.invoiceKey }],
  ])("refuses %s, by its field", (_, patch, issues) => {
    expect(labelPayloadOf({ weight: "650", length: "26", width: "20", height: "9", invoiceKey: "", ...patch }, text.issues)).toEqual({ issues })
  })

  it("says a short wallet with what it holds, the price and the way to Melhor Envio, and Melhor Envio's own words for a refusal", () => {
    expect(labelErrorOf("LABEL_BALANCE_INSUFFICIENT", { balanceCents: 1000, priceCents: 2745, walletUrl: "https://sandbox.melhorenvio.com.br" }, text, money)).toEqual({
      text: "Saldo insuficiente: a carteira tem R$ 10,00 e a etiqueta custa R$ 27,45. Adicione saldo no Melhor Envio (Carteira, Adicionar saldo) e tente de novo. A etiqueta fica guardada no carrinho.",
      href: "https://sandbox.melhorenvio.com.br",
      linkLabel: "Abrir o Melhor Envio",
      external: true,
    })
    expect(labelErrorOf("LABEL_REFUSED", { reason: "CEP de destino inválido." }, text, money).text).toBe("O Melhor Envio recusou a etiqueta: CEP de destino inválido.")
    expect(labelErrorOf("INTEGRATION_NEEDS_RECONNECT", undefined, text, money).text).toBe(text.errors.INTEGRATION_NOT_CONNECTED)
    expect(labelErrorOf("SOMETHING_ELSE", undefined, text, money).text).toBe(text.errors.UNKNOWN)
  })
})
