// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { orderMessageOf, shopOrderMessageOf, whatsappOrderHref } from "./whatsapp-order"

const placed = {
  number: 12,
  items: [
    { productId: "p1", productSlug: "camiseta-preta", productName: "Camiseta preta", variantLabel: null, imageUrl: null, unitPriceCents: 4990, quantity: 2, lineTotalCents: 9980 },
    { productId: "p2", productSlug: "whey", productName: "Whey", variantLabel: "Peso: 900g · Sabor: Chocolate", imageUrl: null, unitPriceCents: 14990, quantity: 1, lineTotalCents: 14990 },
  ],
  totalCents: 24970,
  fulfillment: "DELIVERY" as const,
  deliveryAddress: {
    recipientName: "Rafael",
    zipCode: "01310-930",
    street: "Av. Paulista",
    number: "1000",
    complement: null,
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  },
  paymentMethod: "PIX" as const,
}

describe("the WhatsApp order", () => {
  it("names the placed order by its number, with the lines and total the API priced, where it goes, the payment and who ordered", () => {
    const message = orderMessageOf({
      shopName: "Loja do Design",
      order: placed,
      customer: { name: "Rafael", phone: "11988887777" },
      locale: "pt-BR",
      messages: ptBR,
    }).replace(/\u00a0/g, " ")

    expect(message).toBe(
      [
        "Olá! Fiz o pedido #12 na Loja do Design:",
        "",
        "2× Camiseta preta — R$ 99,80",
        "1× Whey (Peso: 900g · Sabor: Chocolate) — R$ 149,90",
        "",
        "Total: R$ 249,70",
        "Endereço: Av. Paulista, 1000 — Bela Vista — São Paulo/SP — CEP 01310-930",
        "Pagamento: Pix",
        "Nome: Rafael",
        "Celular: 11988887777",
      ].join("\n"),
    )
  })

  it("says a pick-up is picked up, and writes no phone the shop does not have", () => {
    const message = orderMessageOf({
      shopName: "Loja",
      order: { ...placed, fulfillment: "PICKUP", deliveryAddress: null },
      customer: { name: "Bia", phone: null },
      locale: "pt-BR",
      messages: ptBR,
    })

    expect(message).toContain("Retirada na loja")
    expect(message).not.toContain("Endereço:")
    expect(message).not.toContain("Celular:")
  })

  it("escapes the whole message into the link, line breaks and all", () => {
    expect(whatsappOrderHref("5511999998888", "Olá!\n2× Blusa & Saia")).toBe("https://wa.me/5511999998888?text=Ol%C3%A1!%0A2%C3%97%20Blusa%20%26%20Saia")
  })
})

describe("shopOrderMessageOf", () => {
  const order = {
    number: 12,
    status: "PREPARING" as const,
    customer: { id: "c1", name: "Bia", phone: "5511988887777" },
    items: [
      { id: "i1", productId: null, variantId: null, productName: "Camiseta", variantLabel: "Tamanho: M", sku: null, unitPriceCents: 4990, quantity: 2, lineTotalCents: 9980 },
    ],
    fulfillment: "DELIVERY" as const,
    deliveryFeeCents: 1000,
    discountCents: 500,
    totalCents: 10480,
    paymentMethod: "PIX" as const,
  }

  it("greets the customer by name and sends the order back as the shop wrote it", () => {
    expect(shopOrderMessageOf({ shopName: "Loja", order, locale: "pt-BR", messages: ptBR })).toBe(
      [
        "Olá, Bia! Aqui é da Loja. Seu pedido #12:",
        "",
        "2× Camiseta (Tamanho: M) — R$\u00a099,80",
        "",
        "Entrega: R$\u00a010,00",
        "Desconto: − R$\u00a05,00",
        "Total: R$\u00a0104,80",
        "Pagamento: Pix",
        "Status: Em preparo",
      ].join("\n"),
    )
  })

  it("says a pick-up is collected at the shop, with no fee", () => {
    const message = shopOrderMessageOf({ shopName: "Loja", order: { ...order, fulfillment: "PICKUP", deliveryFeeCents: 0, discountCents: 0 }, locale: "pt-BR", messages: ptBR })

    expect(message).toContain("Retirada na loja")
    expect(message).not.toContain("Entrega:")
    expect(message).not.toContain("Desconto")
  })
})
