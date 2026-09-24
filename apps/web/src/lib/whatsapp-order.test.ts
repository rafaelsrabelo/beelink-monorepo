// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import type { CartRow } from "./cart-view"
import { orderMessageOf, whatsappOrderHref } from "./whatsapp-order"

const row = (over: Partial<CartRow>): CartRow => ({
  productId: "p",
  variantId: null,
  name: "Camiseta preta",
  slug: "camiseta-preta",
  variantLabel: null,
  imageUrl: null,
  unitPriceCents: 4990,
  compareAtPriceCents: null,
  qty: 2,
  lineTotalCents: 9980,
  available: true,
  ...over,
})

describe("the WhatsApp order", () => {
  it("lists every line that can be ordered with its combination, the total and the name given", () => {
    const message = orderMessageOf({
      shopName: "Loja do Design",
      view: {
        rows: [
          row({}),
          row({ name: "Whey", variantLabel: "Peso: 900g · Sabor: Chocolate", qty: 1, lineTotalCents: 14990 }),
          row({ name: "Esgotado", available: false }),
        ],
        subtotalCents: 24970,
      },
      customerName: "  Rafael ",
      locale: "pt-BR",
      messages: ptBR,
    }).replace(/ /g, " ")

    expect(message).toBe(
      [
        "Olá! Quero fazer este pedido na Loja do Design:",
        "",
        "2× Camiseta preta — R$ 99,80",
        "1× Whey (Peso: 900g · Sabor: Chocolate) — R$ 149,90",
        "",
        "Total: R$ 249,70",
        "Nome: Rafael",
      ].join("\n"),
    )
  })

  it("leaves the name out when none was given", () => {
    const message = orderMessageOf({ shopName: "Loja", view: { rows: [row({})], subtotalCents: 9980 }, customerName: " ", locale: "pt-BR", messages: ptBR })

    expect(message).not.toContain("Nome:")
  })

  it("escapes the whole message into the link, line breaks and all", () => {
    expect(whatsappOrderHref("5511999998888", "Olá!\n2× Blusa & Saia")).toBe("https://wa.me/5511999998888?text=Ol%C3%A1!%0A2%C3%97%20Blusa%20%26%20Saia")
  })
})
