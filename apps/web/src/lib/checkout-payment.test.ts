// Libs
import { describe, expect, it } from "vitest"

// Types
import type { StorefrontPaymentOptions } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { checkoutPaymentOf, finishesOnWhatsAppOf, heldPaymentOf, paymentPayloadOf } from "./checkout-payment"

const context = { money: (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`, text: ptBR.storefront }
const ONLINE = { pix: true, card: true, maxInstallments: 6, minimumChargeCents: 500, minimumInstallmentCents: 500 }
const BOTH: StorefrontPaymentOptions = { online: ONLINE, offline: true }
const ONLINE_ONLY: StorefrontPaymentOptions = { online: ONLINE, offline: false }
const BEFORE: StorefrontPaymentOptions = { online: null, offline: true }
const SHOP = ["MONEY", "PIX"] as const
const closed = (cents: number | null) => ({ cents, closed: true })

describe("checkoutPaymentOf — what the checkout offers for a cart", () => {
  it("is the checkout of before at a shop that charges nothing online", () => {
    expect(checkoutPaymentOf(BEFORE, SHOP, closed(12000), context)).toEqual({ offlineMethods: SHOP, online: null, nothingToPay: null })
  })

  it("offers Pix and card beside the shop's labels, and only what the shop switched on", () => {
    const plan = checkoutPaymentOf(BOTH, SHOP, closed(12000), context)
    expect(plan.offlineMethods).toEqual(SHOP)
    expect(plan.online).toMatchObject({ methods: ["PIX", "CREDIT_CARD"], unavailable: null, note: null })

    expect(checkoutPaymentOf({ online: { ...ONLINE, card: false }, offline: true }, SHOP, closed(12000), context).online?.methods).toEqual(["PIX"])
    expect(checkoutPaymentOf(ONLINE_ONLY, SHOP, closed(12000), context).offlineMethods).toEqual([])
  })

  it("splits a card from 1 to the shop's most, each instalment at its amount, with no interest", () => {
    expect(checkoutPaymentOf(BOTH, SHOP, closed(12000), context).online?.installments).toEqual([
      { count: 1, label: "1x de R$ 120,00 (à vista)" },
      { count: 2, label: "2x de R$ 60,00 sem juros" },
      { count: 3, label: "3x de R$ 40,00 sem juros" },
      { count: 4, label: "4x de R$ 30,00 sem juros" },
      { count: 5, label: "5x de R$ 24,00 sem juros" },
      { count: 6, label: "6x de R$ 20,00 sem juros" },
    ])
  })

  it("holds the instalments to the total: none under R$ 5,00, and the amount shown rounded down", () => {
    // R$ 14,99 splits in two of R$ 7,49; a third would be R$ 4,99.
    expect(checkoutPaymentOf(BOTH, SHOP, closed(1499), context).online?.installments).toEqual([
      { count: 1, label: "1x de R$ 14,99 (à vista)" },
      { count: 2, label: "2x de R$ 7,49 sem juros" },
    ])
    expect(checkoutPaymentOf(BOTH, SHOP, closed(500), context).online?.installments).toHaveLength(1)
    expect(checkoutPaymentOf({ online: { ...ONLINE, maxInstallments: 1 }, offline: true }, SHOP, closed(90000), context).online?.installments).toHaveLength(1)
  })

  it("switches online off under the least charge, and says why — differently where there is no other way", () => {
    const beside = checkoutPaymentOf(BOTH, SHOP, closed(499), context)
    expect(beside.online).toMatchObject({ unavailable: "O pagamento online vale para pedidos a partir de R$ 5,00.", installments: [] })
    expect(beside.offlineMethods).toEqual(SHOP)

    expect(checkoutPaymentOf(ONLINE_ONLY, SHOP, closed(499), context).online?.unavailable).toBe("Esta loja só recebe online, e o pagamento online vale a partir de R$ 5,00. Adicione mais itens para fechar o pedido.")
  })

  it("lets a total with a fee to be agreed be paid online afterwards: warned, with no amount promised and no least charge held yet", () => {
    const plan = checkoutPaymentOf(BOTH, SHOP, { cents: 300, closed: false }, context)

    expect(plan.online?.unavailable).toBeNull()
    expect(plan.online?.note).toMatch(/Você paga depois que a loja informar o frete/)
    expect(plan.online?.installments.slice(0, 2)).toEqual([{ count: 1, label: "À vista" }, { count: 2, label: "2x sem juros" }])
    expect(plan.online?.installments).toHaveLength(6)
  })

  it("asks nothing when the closed total is zero — and still asks while a fee could be added to it", () => {
    expect(checkoutPaymentOf(ONLINE_ONLY, SHOP, closed(0), context)).toEqual({ offlineMethods: [], online: null, nothingToPay: "Nada a pagar: o desconto cobre o pedido inteiro." })
    expect(checkoutPaymentOf(ONLINE_ONLY, SHOP, { cents: 0, closed: false }, context).nothingToPay).toBeNull()
    // Before Asaas a free order chose a label like any other: nothing changes there.
    expect(checkoutPaymentOf(BEFORE, SHOP, closed(0), context).nothingToPay).toBeNull()
  })

  it("offers the ways with no amount while the cart has no price yet", () => {
    const plan = checkoutPaymentOf(BOTH, SHOP, closed(null), context)
    expect(plan.online).toMatchObject({ unavailable: null, note: null })
    expect(plan.online?.installments[0]).toEqual({ count: 1, label: "À vista" })
  })
})

describe("heldPaymentOf — the payment held to what is offered now", () => {
  const plan = checkoutPaymentOf(BOTH, SHOP, closed(1499), context)

  it("keeps what was picked while the checkout still offers it", () => {
    expect(heldPaymentOf({ paymentChannel: "ONLINE", paymentMethod: "PIX" }, plan)).toEqual({ paymentChannel: "ONLINE", paymentMethod: "PIX", installments: 1 })
    expect(heldPaymentOf({ paymentMethod: "MONEY" }, plan)).toEqual({ paymentChannel: "OFFLINE", paymentMethod: "MONEY", installments: 1 })
  })

  it("holds a card's instalments to what the total splits into now, and a Pix to one", () => {
    expect(heldPaymentOf({ paymentChannel: "ONLINE", paymentMethod: "CREDIT_CARD", installments: 6 }, plan).installments).toBe(2)
    expect(heldPaymentOf({ paymentChannel: "ONLINE", paymentMethod: "PIX", installments: 3 }, plan).installments).toBe(1)
  })

  it("drops a way no longer offered: an online one under the least charge, a label the shop does not settle by", () => {
    const short = checkoutPaymentOf(BOTH, SHOP, closed(300), context)
    expect(heldPaymentOf({ paymentChannel: "ONLINE", paymentMethod: "PIX" }, short).paymentMethod).toBeNull()
    expect(heldPaymentOf({ paymentMethod: "DEBIT_CARD" }, plan).paymentMethod).toBeNull()
    // A credit card settled with the shop is not the credit card charged online.
    expect(heldPaymentOf({ paymentChannel: "OFFLINE", paymentMethod: "CREDIT_CARD" }, plan).paymentMethod).toBeNull()
  })

  it("stands the only way there is as chosen, on either channel, and assumes none among several", () => {
    expect(heldPaymentOf({ paymentMethod: null }, plan).paymentMethod).toBeNull()
    expect(heldPaymentOf({ paymentMethod: null }, checkoutPaymentOf(BEFORE, ["PIX"], closed(1499), context))).toEqual({ paymentChannel: "OFFLINE", paymentMethod: "PIX", installments: 1 })
    expect(heldPaymentOf({ paymentMethod: null }, checkoutPaymentOf({ online: { ...ONLINE, card: false }, offline: false }, SHOP, closed(1499), context))).toEqual({ paymentChannel: "ONLINE", paymentMethod: "PIX", installments: 1 })
    // Online switched off by the total leaves the shop's one label as the only way.
    expect(heldPaymentOf({ paymentMethod: null }, checkoutPaymentOf(BOTH, ["MONEY"], closed(300), context)).paymentMethod).toBe("MONEY")
  })
})

describe("paymentPayloadOf — how the payment goes with the order", () => {
  const plan = checkoutPaymentOf(BOTH, SHOP, closed(12000), context)

  it("sends a way settled with the shop as it always went: the label alone", () => {
    expect(paymentPayloadOf({ paymentChannel: "OFFLINE", paymentMethod: "MONEY", installments: 1 }, plan, SHOP)).toEqual({ paymentMethod: "MONEY" })
  })

  it("sends an online way with its channel, and the instalments only when split", () => {
    expect(paymentPayloadOf({ paymentChannel: "ONLINE", paymentMethod: "PIX", installments: 1 }, plan, SHOP)).toEqual({ paymentMethod: "PIX", paymentChannel: "ONLINE" })
    expect(paymentPayloadOf({ paymentChannel: "ONLINE", paymentMethod: "CREDIT_CARD", installments: 3 }, plan, SHOP)).toEqual({ paymentMethod: "CREDIT_CARD", paymentChannel: "ONLINE", installments: 3 })
  })

  it("sends nothing until a way is chosen", () => {
    expect(paymentPayloadOf({ paymentChannel: "OFFLINE", paymentMethod: null, installments: 1 }, plan, SHOP)).toBeNull()
  })

  it("settles an order with nothing to pay with the shop, by its first label, with no way chosen", () => {
    const free = checkoutPaymentOf(ONLINE_ONLY, SHOP, closed(0), context)
    expect(paymentPayloadOf(heldPaymentOf({ paymentChannel: "ONLINE", paymentMethod: "PIX" }, free), free, SHOP)).toEqual({ paymentMethod: "MONEY" })
  })
})

describe("finishesOnWhatsAppOf — what the product page says of where the order ends", () => {
  it("says so of a shop with a WhatsApp that charges nothing online", () => {
    expect(finishesOnWhatsAppOf("5585999990000", BEFORE)).toBe(true)
  })

  // The owner's report: Pix and card on, paying on delivery off, and the page still sent shoppers to WhatsApp.
  it("does not say so once the shop takes Pix or card, with paying on delivery or without", () => {
    expect(finishesOnWhatsAppOf("5585999990000", ONLINE_ONLY)).toBe(false)
    expect(finishesOnWhatsAppOf("5585999990000", BOTH)).toBe(false)
  })

  it("never says so of a shop with no WhatsApp", () => {
    expect(finishesOnWhatsAppOf(undefined, BEFORE)).toBe(false)
    expect(finishesOnWhatsAppOf("", BEFORE)).toBe(false)
  })
})
