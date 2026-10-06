// Libs
import { describe, expect, it } from "vitest"

// Types
import type { OrderPaymentStatus } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { holdsMoney, orderPaymentLabelOf, type PaidOrder } from "./order-payment-label"

const now = new Date("2026-10-06T15:00:00.000Z")
const LATER = "2026-10-08T02:59:59.999Z"
const EARLIER = "2026-10-06T02:59:59.999Z"
const order = (over: Partial<PaidOrder> = {}): PaidOrder => ({ status: "RECEIVED", fulfillment: "PICKUP", deliveryFeeCents: 0, paymentChannel: "ONLINE", payment: { status: "PENDING", expiresAt: LATER, paidAt: null }, ...over })
const label = (over: Partial<PaidOrder> = {}) => orderPaymentLabelOf(order(over), ptBR.storefront, now)
const charge = (status: OrderPaymentStatus, expiresAt: string | null = LATER) => ({ payment: { status, expiresAt, paidAt: null } })

describe("orderPaymentLabelOf — where an order's online payment stands", () => {
  it("says nothing of an order settled with the shop: nothing there is ever approved", () => {
    expect(label({ paymentChannel: "OFFLINE", payment: null })).toBeNull()
  })

  it("says a waiting charge is awaiting payment, and that there is something to pay", () => {
    expect(label()).toEqual({ label: "Aguardando pagamento", tone: "wait", payable: true })
  })

  it("says the same of an order with no charge yet, and of one Asaas refused to make: the screen makes one", () => {
    expect(label({ payment: null })).toEqual({ label: "Aguardando pagamento", tone: "wait", payable: true })
    expect(label(charge("FAILED", null))).toEqual({ label: "Aguardando pagamento", tone: "wait", payable: true })
  })

  it("says approved for a charge confirmed or received, with nothing left to pay", () => {
    expect(label(charge("CONFIRMED"))).toEqual({ label: "Pagamento aprovado", tone: "done", payable: false })
    expect(label(charge("RECEIVED"))).toEqual({ label: "Pagamento aprovado", tone: "done", payable: false })
  })

  it("says expired for a charge past its time — heard from Asaas or read from the clock — and still leads to paying", () => {
    expect(label(charge("OVERDUE"))).toEqual({ label: "Pagamento vencido", tone: "stop", payable: true })
    expect(label(charge("PENDING", EARLIER))).toEqual({ label: "Pagamento vencido", tone: "stop", payable: true })
  })

  it("says cancelled for a charge removed, which another can replace", () => {
    expect(label(charge("CANCELLED"))).toEqual({ label: "Pagamento cancelado", tone: "stop", payable: true })
  })

  it("says the payment waits on the shop while the delivery fee is not agreed, with nothing to press", () => {
    expect(label({ fulfillment: "DELIVERY", deliveryFeeCents: null, payment: null })).toEqual({ label: "Pagamento liberado quando a loja informar o frete", tone: "wait", payable: false })
  })

  it("says what was given back", () => {
    expect(label(charge("REFUNDED"))).toMatchObject({ label: "Pagamento estornado", payable: false })
    expect(label(charge("PARTIALLY_REFUNDED"))).toMatchObject({ label: "Pagamento estornado em parte", payable: false })
  })

  it("offers nothing to pay on a cancelled order, and keeps saying what was paid on it", () => {
    expect(label({ status: "CANCELLED" })).toEqual({ label: "Pagamento cancelado", tone: "stop", payable: false })
    expect(label({ status: "CANCELLED", payment: null })).toBeNull()
    expect(label({ status: "CANCELLED", ...charge("CONFIRMED") })).toMatchObject({ label: "Pagamento aprovado" })
  })
})

describe("holdsMoney — whether a charge keeps an order from being cancelled", () => {
  it("is so once paid, and while only part was given back", () => {
    expect((["CONFIRMED", "RECEIVED", "PARTIALLY_REFUNDED"] as const).map((status) => holdsMoney({ status }))).toEqual([true, true, true])
    expect((["PENDING", "OVERDUE", "REFUNDED", "CANCELLED", "FAILED"] as const).map((status) => holdsMoney({ status }))).toEqual([false, false, false, false, false])
    expect(holdsMoney(null)).toBe(false)
  })
})
