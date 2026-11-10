// Libs
import { describe, expect, it } from "vitest"

// Types
import type { Order } from "@harness-monorepo/contracts"

// UI
import { ptBR as messages } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { courierMessageOf, whatsappShareHref } from "./courier-message"

const order: Order = {
  id: "o1",
  number: 1041,
  status: "PREPARING",
  customer: { id: "c1", name: "Bruno Mendes", phone: "5585999990000" },
  fulfillment: "DELIVERY",
  deliveryAddress: { recipientName: "Bruno Mendes", street: "Rua dos Ipês", number: "455", complement: null, neighborhood: "Jardim", city: "Fortaleza", state: "CE", zipCode: "60000000" },
  paymentMethod: "MONEY",
  paymentChannel: "OFFLINE",
  installments: 1,
  payment: null,
  items: [
    {
      id: "i1",
      productId: "p1",
      variantId: "v1",
      productName: "Kit Festa",
      variantLabel: null,
      sku: null,
      unitPriceCents: 13980,
      quantity: 1,
      lineTotalCents: 13980,
      discountCents: 0,
      promotionName: null,
      kitParts: [
        { productName: "Ninho com Nutella", variantLabel: null, quantity: 12 },
        { productName: "Morango", variantLabel: null, quantity: 8 },
      ],
    },
    { id: "i2", productId: "p2", variantId: "v2", productName: "Dindin", variantLabel: "Sabor: Coco", sku: null, unitPriceCents: 580, quantity: 3, lineTotalCents: 1740, discountCents: 0, promotionName: null },
  ],
  subtotalCents: 15720,
  deliveryFeeCents: 700,
  discountCents: 0,
  promotionDiscountCents: 0,
  couponDiscountCents: 0,
  coupon: null,
  cashback: null,
  cashbackUsedCents: 0,
  totalCents: 16420,
  note: "Portão verde",
  placedAt: "2026-11-10T16:00:00.000Z",
  events: [{ status: "RECEIVED", actor: "CUSTOMER", at: "2026-11-10T16:00:00.000Z" }],
  origin: null,
  delivery: null,
  deliveryWindow: null,
  createdAt: "2026-11-10T16:00:00.000Z",
}

const input = { shopName: "Dindin da Leia", locale: "pt-BR", messages }

describe("the shop's courier's message", () => {
  it("tells where, for whom, what goes — a kit with what was chosen — and what to collect", () => {
    // Money is written with the no-break space Intl puts after "R$".
    expect(courierMessageOf({ ...input, order })?.replace(/\u00a0/g, " ")).toBe(
      [
        "*Entrega · Dindin da Leia · pedido #1041*",
        "Cliente: Bruno Mendes",
        "Telefone: +5585999990000",
        "Endereço: Rua dos Ipês, 455 — Jardim — Fortaleza/CE — CEP 60000-000",
        "",
        "Itens:",
        "- 1× Kit Festa",
        "   · 12× Ninho com Nutella",
        "   · 8× Morango",
        "- 3× Dindin (Sabor: Coco)",
        "",
        "Cobrar na entrega: R$ 164,20 (Dinheiro)",
        "Obs.: Portão verde",
      ].join("\n"),
    )
  })

  it("says an order paid online is paid, and one whose payment is not confirmed is to be checked", () => {
    const online = { ...order, paymentMethod: "PIX", paymentChannel: "ONLINE", note: null } as const
    const paid = courierMessageOf({ ...input, order: { ...online, payment: { ...paidCharge } } })
    expect(paid?.split("\n").at(-1)).toBe("Pagamento: já está pago.")
    expect(courierMessageOf({ ...input, order: online })?.split("\n").at(-1)).toBe("Pagamento online ainda não confirmado: confira antes de sair.")
  })

  it("has nothing to send for a pick-up or a delivery with no address", () => {
    expect(courierMessageOf({ ...input, order: { ...order, fulfillment: "PICKUP", deliveryAddress: null } })).toBeNull()
    expect(courierMessageOf({ ...input, order: { ...order, deliveryAddress: null } })).toBeNull()
  })

  it("opens WhatsApp with the message written and no one chosen", () => {
    expect(whatsappShareHref("Entrega #1\nRua A")).toBe("https://wa.me/?text=Entrega%20%231%0ARua%20A")
  })
})

const paidCharge = {
  id: "pay1",
  status: "RECEIVED",
  method: "PIX",
  amountCents: 16420,
  paidAt: "2026-11-10T16:01:00.000Z",
} as unknown as NonNullable<Order["payment"]>
