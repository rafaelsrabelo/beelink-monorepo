// Libs
import { describe, expect, it } from "vitest"

// Types
import type { CustomerOrderPayment } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { PAYMENT_POLL_MS, PIX_CODE_POLL_MS, paymentDeadlineOf, paymentInstallmentsText, paymentPollMsOf, paymentScreenOf } from "./order-payment-view"

const now = new Date("2026-10-06T15:00:00.000Z")
const LATER = "2026-10-08T02:59:59.999Z"
const EARLIER = "2026-10-06T02:59:59.999Z"
const STANDS = { cancelled: false, awaitingTotal: false }
const PIX = { payload: "000201", image: "aGk=", expiresAt: LATER }

const pix = (over: Partial<CustomerOrderPayment> = {}): CustomerOrderPayment => ({ status: "PENDING", method: "PIX", installments: 1, amountCents: 5990, refundedCents: 0, expiresAt: LATER, paidAt: null, pix: PIX, invoiceUrl: null, ...over })
const card = (over: Partial<CustomerOrderPayment> = {}): CustomerOrderPayment => pix({ method: "CREDIT_CARD", installments: 3, amountCents: 23970, pix: null, invoiceUrl: "https://www.asaas.com/i/abc", ...over })
const screen = (payment: CustomerOrderPayment | null, order = STANDS) => paymentScreenOf(payment, order, now)

describe("paymentScreenOf — what the payment screen shows", () => {
  it("shows a waiting Pix with its amount, QR, code and until when the code is good", () => {
    expect(screen(pix())).toEqual({ kind: "pix", amountCents: 5990, image: "aGk=", payload: "000201", expiresAt: LATER })
  })

  it("waits for a Pix's code Asaas has not handed over", () => {
    expect(screen(pix({ pix: null }))).toEqual({ kind: "notice", variant: "pixWaiting", acts: false })
  })

  it("offers a new Pix once it is past its time: by the charge's day, by the code's own end, or by Asaas's word", () => {
    const expired = { kind: "notice", variant: "pixExpired", acts: true }
    expect(screen(pix({ expiresAt: EARLIER, pix: null }))).toEqual(expired)
    expect(screen(pix({ pix: { ...PIX, expiresAt: EARLIER } }))).toEqual(expired)
    expect(screen(pix({ status: "OVERDUE", pix: null }))).toEqual(expired)
  })

  it("shows a waiting card with its amount, instalments and Asaas's page", () => {
    expect(screen(card())).toEqual({ kind: "card", amountCents: 23970, installments: 3, invoiceUrl: "https://www.asaas.com/i/abc", expiresAt: LATER })
  })

  it("offers a new payment for a card past its time, or with no page to pay it on", () => {
    const expired = { kind: "notice", variant: "cardExpired", acts: true }
    expect(screen(card({ expiresAt: EARLIER, invoiceUrl: null }))).toEqual(expired)
    expect(screen(card({ status: "OVERDUE", invoiceUrl: null }))).toEqual(expired)
    expect(screen(card({ invoiceUrl: null }))).toEqual(expired)
  })

  it("offers to make a charge when there is none, when Asaas refused the last, and when the last was removed", () => {
    expect(screen(null)).toEqual({ kind: "notice", variant: "none", acts: true })
    expect(screen(pix({ status: "FAILED", expiresAt: null, pix: null }))).toEqual({ kind: "notice", variant: "none", acts: true })
    expect(screen(pix({ status: "CANCELLED", pix: null }))).toEqual({ kind: "notice", variant: "chargeCancelled", acts: true })
  })

  it("waits on the shop while the delivery fee is not agreed, with no charge to make", () => {
    expect(screen(null, { cancelled: false, awaitingTotal: true })).toEqual({ kind: "notice", variant: "awaitingTotal", acts: false })
    // A charge removed when the fee was reopened does not offer another until the fee is told.
    expect(screen(pix({ status: "CANCELLED", pix: null }), { cancelled: false, awaitingTotal: true })).toMatchObject({ variant: "awaitingTotal" })
  })

  it("says approved for a charge confirmed or received — whatever became of the order", () => {
    expect(screen(pix({ status: "RECEIVED", pix: null, paidAt: now.toISOString() }))).toEqual({ kind: "notice", variant: "paid", acts: false })
    expect(screen(card({ status: "CONFIRMED", invoiceUrl: null }))).toMatchObject({ variant: "paid" })
    expect(screen(pix({ status: "RECEIVED", pix: null }), { cancelled: true, awaitingTotal: false })).toMatchObject({ variant: "paid" })
  })

  it("says what was given back, and that a cancelled order has nothing to pay", () => {
    expect(screen(pix({ status: "REFUNDED", pix: null }))).toMatchObject({ variant: "refunded", acts: false })
    expect(screen(pix({ status: "PARTIALLY_REFUNDED", pix: null }))).toMatchObject({ variant: "refunded" })
    expect(screen(pix({ pix: null }), { cancelled: true, awaitingTotal: false })).toEqual({ kind: "notice", variant: "orderCancelled", acts: false })
    expect(screen(null, { cancelled: true, awaitingTotal: false })).toMatchObject({ variant: "orderCancelled" })
  })
})

describe("paymentPollMsOf — when the screen reads again by itself", () => {
  it("reads again while it waits for money, slower while it waits for a Pix's code, and not at all otherwise", () => {
    expect(paymentPollMsOf(screen(pix()))).toBe(PAYMENT_POLL_MS)
    expect(paymentPollMsOf(screen(card()))).toBe(PAYMENT_POLL_MS)
    expect(paymentPollMsOf(screen(pix({ pix: null })))).toBe(PIX_CODE_POLL_MS)

    for (const still of [screen(null), screen(pix({ status: "RECEIVED", pix: null })), screen(pix({ expiresAt: EARLIER, pix: null })), screen(null, { cancelled: false, awaitingTotal: true }), screen(null, { cancelled: true, awaitingTotal: false })]) {
      expect(paymentPollMsOf(still)).toBe(false)
    }
  })
})

describe("the screen's words", () => {
  const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`

  it("writes a card's split: in full, or each instalment rounded down", () => {
    expect(paymentInstallmentsText(23970, 1, money, ptBR.storefront)).toBe("À vista")
    expect(paymentInstallmentsText(23970, 3, money, ptBR.storefront)).toBe("3x de R$ 79,90 sem juros")
    expect(paymentInstallmentsText(10000, 3, money, ptBR.storefront)).toBe("3x de R$ 33,33 sem juros")
  })

  it("writes until when a charge is paid in Brasília's time, whatever the reader's zone", () => {
    expect(paymentDeadlineOf(LATER, "pt-BR")).toBe("7 de out., 23:59")
  })
})
