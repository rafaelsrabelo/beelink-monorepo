// Libs
import { describe, expect, it } from "vitest"

// Locales
import { ptBR } from "../locales/pt-BR"

// App
import { customerPopupWordsOf, popupWordsOf, typedDiscountIn, type CustomerPopupOfferValue, type PopupBenefitValue, type PopupCopyValue } from "./shop-popup"

const BLANK: PopupCopyValue = { title: null, text: null, buttonLabel: null }
const coupon: PopupBenefitValue = { source: "COUPON", kind: "PERCENT", percentBps: 500, amountCents: null, minSubtotalCents: 0, wholeCart: true }
const words = (copy = BLANK, benefit: PopupBenefitValue | null = coupon) => popupWordsOf(copy, benefit, "pt-BR", ptBR)

describe("popupWordsOf", () => {
  it("says the defaults with the benefit's own number, and a button named for a coupon", () => {
    expect(words()).toEqual({ title: "Ganhe 5% de desconto na primeira compra", text: "Crie sua conta e o desconto é seu.", detail: null, buttonLabel: "Ganhar cupom" })
  })

  it("names the button for a promotion, which has no coupon to get", () => {
    expect(words(BLANK, { ...coupon, source: "PROMOTION", percentBps: 1500 })).toMatchObject({ title: "Ganhe 15% de desconto na primeira compra", buttonLabel: "Ganhar desconto" })
  })

  it("says an amount and a free delivery as what they are", () => {
    expect(words(BLANK, { ...coupon, kind: "FIXED", percentBps: null, amountCents: 1500 }).title).toMatch(/^Ganhe R\$\s15,00 de desconto na primeira compra$/)
    expect(words(BLANK, { ...coupon, kind: "FREE_SHIPPING", percentBps: null })).toMatchObject({ title: "Ganhe frete grátis na primeira compra", text: "Crie sua conta e o frete grátis é seu." })
  })

  it("fills the placeholder wherever the shopkeeper put it, every time", () => {
    const typed = { title: "Ei! {beneficio} te espera", text: "É {beneficio}. Sim, {beneficio}.", buttonLabel: "Quero {beneficio}" }

    expect(words(typed)).toMatchObject({ title: "Ei! 5% de desconto te espera", text: "É 5% de desconto. Sim, 5% de desconto.", buttonLabel: "Quero 5% de desconto" })
  })

  it("says the benefit's own conditions under the text: its minimum, and that it is over selected products", () => {
    expect(words(BLANK, { ...coupon, minSubtotalCents: 5000 }).detail).toMatch(/^Em compras a partir de R\$\s50,00\.$/)
    expect(words(BLANK, { ...coupon, source: "PROMOTION", wholeCart: false }).detail).toBe("Vale para produtos selecionados.")
  })

  describe("with no benefit in force", () => {
    it("is the plain invitation, and promises nothing", () => {
      const plain = words(BLANK, null)

      expect(plain).toEqual({ title: "Crie sua conta na loja", text: "Acompanhe seus pedidos, salve favoritos e compre mais rápido.", detail: null, buttonLabel: "Criar minha conta" })
      expect(Object.values(plain).join(" ")).not.toMatch(/desconto|cupom|%|R\$/)
    })

    it("replaces a sentence that names the benefit, and keeps one written by hand", () => {
      const typed = { title: "Ganhe {beneficio} agora", text: "Receba nossas novidades primeiro.", buttonLabel: "Quero {beneficio}" }

      expect(words(typed, null)).toEqual({ title: "Crie sua conta na loja", text: "Receba nossas novidades primeiro.", detail: null, buttonLabel: "Criar minha conta" })
    })

    it("never leaves the placeholder on the page", () => {
      expect(Object.values(words({ title: "{beneficio}", text: "{beneficio}", buttonLabel: "{beneficio}" }, null)).join(" ")).not.toContain("{beneficio}")
    })
  })
})

describe("typedDiscountIn", () => {
  it.each(["Ganhe 10% agora", "10 % off", "R$ 15 de desconto", "r$15,00"])('reads "%s" as a discount typed by hand', (sentence) => {
    expect(typedDiscountIn(sentence)).toBe(true)
  })

  it.each(["Ganhe {beneficio}", "Entrega em 2 dias", "Parcele em 10 vezes"])('takes "%s"', (sentence) => {
    expect(typedDiscountIn(sentence)).toBe(false)
  })
})

describe("customerPopupWordsOf (BEELINK-310)", () => {
  const theirs: CustomerPopupOfferValue = { source: "COUPON", code: "SEJAMUTANTE", kind: "PERCENT", percentBps: 1500, amountCents: null, minSubtotalCents: 0 }
  const say = (offer: CustomerPopupOfferValue) => customerPopupWordsOf(offer, "pt-BR", ptBR)

  it("says the coupon: the benefit's own number, the code, and the way to the cart", () => {
    expect(say(theirs)).toEqual({ title: "Seu primeiro pedido tem 15% de desconto", text: "Use este cupom no carrinho:", detail: null, buttonLabel: "Usar no carrinho", code: "SEJAMUTANTE" })
  })

  it("says the coupon's minimum, with the API's amount", () => {
    expect(say({ ...theirs, minSubtotalCents: 5000 }).detail).toMatch(/^Em compras a partir de R\$\s50,00\.$/)
  })

  it("says an amount and a free delivery as what they are", () => {
    expect(say({ ...theirs, kind: "FIXED", percentBps: null, amountCents: 1500 }).title).toMatch(/^Seu primeiro pedido tem R\$\s15,00 de desconto$/)
    expect(say({ ...theirs, kind: "FREE_SHIPPING", percentBps: null }).title).toBe("Seu primeiro pedido tem frete grátis")
  })

  it("says a promotion applies by itself: no code, and a button that only closes", () => {
    expect(say({ source: "PROMOTION", kind: "PERCENT", percentBps: 1000, amountCents: null, minSubtotalCents: 0, wholeCart: true })).toEqual({
      title: "Seu primeiro pedido tem 10% de desconto",
      text: "Aplicado automaticamente no seu primeiro pedido. Não precisa de código.",
      detail: null,
      buttonLabel: "Continuar comprando",
      code: null,
    })
  })

  it("says a promotion over named products as that", () => {
    expect(say({ source: "PROMOTION", kind: "PERCENT", percentBps: 1000, amountCents: null, minSubtotalCents: 0, wholeCart: false }).title).toBe("Seu primeiro pedido tem 10% de desconto em produtos selecionados")
  })

  it("never says a sentence written for a visitor", () => {
    const words = JSON.stringify(say(theirs))

    expect(words).not.toMatch(/Crie sua conta|Ganhar cupom|Criar minha conta/)
  })
})
