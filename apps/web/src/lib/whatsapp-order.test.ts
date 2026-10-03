// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { orderMessageOf, shopOrderMessageOf, whatsappOrderHref } from "./whatsapp-order"

const placed = {
  number: 12,
  items: [
    { productId: "p1", productSlug: "camiseta-preta", productName: "Camiseta preta", variantLabel: null, imageUrl: null, unitPriceCents: 4990, quantity: 2, lineTotalCents: 9980, discountCents: 0, promotionName: null },
    { productId: "p2", productSlug: "whey", productName: "Whey", variantLabel: "Peso: 900g · Sabor: Chocolate", imageUrl: null, unitPriceCents: 14990, quantity: 1, lineTotalCents: 14990, discountCents: 0, promotionName: null },
  ],
  // The lines add up to R$ 249,70; the delivery the checkout quoted is R$ 10,00 on top (BEELINK-178).
  totalCents: 25970,
  deliveryFeeCents: 1000,
  discountCents: 0,
  promotionDiscountCents: 0,
  couponDiscountCents: 0,
  coupon: null,
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
        "Entrega: R$ 10,00",
        "Total: R$ 259,70",
        "Endereço: Av. Paulista, 1000 — Bela Vista — São Paulo/SP — CEP 01310-930",
        "Pagamento: Pix",
        "Nome: Rafael",
        "Celular: 11988887777",
      ].join("\n"),
    )
  })

  it("writes the total '+ frete' while the delivery's fee is not agreed", () => {
    const message = orderMessageOf({ shopName: "Loja do Design", order: { ...placed, deliveryFeeCents: null, totalCents: 24970 }, customer: { name: "Rafael", phone: null }, locale: "pt-BR", messages: ptBR }).replace(/\u00a0/g, " ")

    expect(message).toContain("Total: R$ 249,70 + frete")
    expect(message).not.toContain("Entrega:")
  })

  /** BEELINK-194: the lines are at the catalogue's price, so what came off stands between them and the total. */
  it("says what the promotion and the coupon took off, between the lines and the total", () => {
    const discounted = { ...placed, totalCents: 21723, discountCents: 4247, promotionDiscountCents: 1499, couponDiscountCents: 2748, coupon: { code: "BEMVINDO10", kind: "PERCENT" as const } }
    const message = orderMessageOf({ shopName: "Loja do Design", order: discounted, customer: { name: "Rafael", phone: null }, locale: "pt-BR", messages: ptBR }).replace(/\u00a0/g, " ")

    expect(message.split("\n").slice(4, 9)).toEqual(["", "Entrega: R$ 10,00", "Promoção: − R$ 14,99", "Cupom BEMVINDO10: − R$ 27,48", "Total: R$ 217,23"])
  })

  /** BEELINK-244: the customer's credit is its own line, after the discounts — the total under it is already less it. */
  it("says the cashback used on its own line, after the coupon and before the total", () => {
    const paid = { ...placed, totalCents: 21222, discountCents: 2748, promotionDiscountCents: 0, couponDiscountCents: 2748, coupon: { code: "BEMVINDO10", kind: "PERCENT" as const }, cashbackUsedCents: 1000 }
    const message = orderMessageOf({ shopName: "Loja do Design", order: paid, customer: { name: "Rafael", phone: null }, locale: "pt-BR", messages: ptBR }).replace(/\u00a0/g, " ")

    expect(message).toContain("Cupom BEMVINDO10: − R$ 27,48\nCashback usado: − R$ 10,00\nTotal: R$ 212,22\n")
    expect(orderMessageOf({ shopName: "Loja do Design", order: placed, customer: { name: "Rafael", phone: null }, locale: "pt-BR", messages: ptBR })).not.toContain("Cashback usado")
  })

  it("says a free delivery coupon in words, and a total with no '+ frete': the coupon waives whatever is agreed", () => {
    const free = { ...placed, deliveryFeeCents: null, totalCents: 24970, coupon: { code: "FRETEGRATIS", kind: "FREE_SHIPPING" as const } }
    const message = orderMessageOf({ shopName: "Loja do Design", order: free, customer: { name: "Rafael", phone: null }, locale: "pt-BR", messages: ptBR }).replace(/\u00a0/g, " ")

    expect(message).toContain("Cupom FRETEGRATIS: Frete grátis\nTotal: R$ 249,70\n")
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
      { id: "i1", productId: null, variantId: null, productName: "Camiseta", variantLabel: "Tamanho: M", sku: null, unitPriceCents: 4990, quantity: 2, lineTotalCents: 9980, discountCents: 0, promotionName: null },
    ],
    fulfillment: "DELIVERY" as const,
    deliveryFeeCents: 1000,
    discountCents: 500,
    promotionDiscountCents: 0,
    couponDiscountCents: 0,
    coupon: null,
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

  it("breaks the discount into the promotion, the coupon by its code and what the shop typed", () => {
    const discounted = { ...order, discountCents: 2496, promotionDiscountCents: 998, couponDiscountCents: 998, coupon: { code: "BEMVINDO10", kind: "PERCENT" as const }, totalCents: 8484 }
    const message = shopOrderMessageOf({ shopName: "Loja", order: discounted, locale: "pt-BR", messages: ptBR }).replace(/\u00a0/g, " ")

    expect(message.split("\n").slice(4, 9)).toEqual(["Entrega: R$ 10,00", "Promoção: − R$ 9,98", "Cupom BEMVINDO10: − R$ 9,98", "Desconto: − R$ 5,00", "Total: R$ 84,84"])
  })

  it("says a fee not agreed yet is to be agreed, and the total leaves it out", () => {
    const message = shopOrderMessageOf({ shopName: "Loja", order: { ...order, deliveryFeeCents: null, totalCents: 9480 }, locale: "pt-BR", messages: ptBR })

    expect(message).toContain("Entrega: a combinar")
    expect(message).toContain("Total: R$\u00a094,80 + frete")
  })

  it("says nothing of a fee on a cancelled order that never agreed one", () => {
    const message = shopOrderMessageOf({ shopName: "Loja", order: { ...order, status: "CANCELLED", deliveryFeeCents: null, totalCents: 9480 }, locale: "pt-BR", messages: ptBR })

    expect(message).not.toContain("a combinar")
    expect(message).not.toContain("+ frete")
    expect(message).toContain("Total: R$\u00a094,80")
  })

  it("says a pick-up is collected at the shop, with no fee", () => {
    const message = shopOrderMessageOf({ shopName: "Loja", order: { ...order, fulfillment: "PICKUP", deliveryFeeCents: 0, discountCents: 0 }, locale: "pt-BR", messages: ptBR })

    expect(message).toContain("Retirada na loja")
    expect(message).not.toContain("Entrega:")
    expect(message).not.toContain("Desconto")
  })
})
