// Libs
import { describe, expect, it } from "vitest"

// Types
import type { ShopperCashback } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { CASHBACK_PAGE_MAX, cashbackPageOf, cashbackTabViewOf } from "./cashback-tab-view"

const context = { locale: "pt-BR", messages: ptBR }
/** Money is written with a no-break space: read here as any space. */
const plain = (value: string | null) => value?.replace(/\s/g, " ") ?? null

const cashback: ShopperCashback = {
  balanceCents: 800,
  pendingCents: 599,
  nextExpiry: { amountCents: 300, expiresAt: "2026-11-10T15:00:00.000Z" },
  credits: [
    { id: "c1", status: "AVAILABLE", amountCents: 500, remainingCents: 300, orderNumber: 12, availableAt: "2026-10-01T15:00:00.000Z", expiresAt: "2026-11-10T15:00:00.000Z" },
    { id: "c2", status: "AVAILABLE", amountCents: 500, remainingCents: 500, orderNumber: null, availableAt: "2026-10-02T15:00:00.000Z", expiresAt: null },
    { id: "c3", status: "PENDING", amountCents: 599, remainingCents: 599, orderNumber: 14, availableAt: null, expiresAt: null },
  ],
  entries: [
    { id: "e3", kind: "ADJUST", amountCents: 500, orderNumber: null, createdAt: "2026-10-02T15:00:00.000Z" },
    { id: "e2", kind: "REDEEM", amountCents: -200, orderNumber: 13, createdAt: "2026-10-02T02:30:00.000Z" },
    { id: "e1", kind: "EARN", amountCents: 500, orderNumber: 12, createdAt: "2026-10-01T15:00:00.000Z" },
  ],
  total: 3,
  page: 1,
  pageSize: 20,
}

describe("cashbackTabViewOf", () => {
  it("says the balance, what is pending and what expires first", () => {
    const view = cashbackTabViewOf(cashback, null, context)

    expect(plain(view.balance)).toBe("R$ 8,00")
    expect(plain(view.pending)).toBe("R$ 5,99")
    expect(plain(view.expiry)).toBe("R$ 3,00 vencem em 10/11/2026")
  })

  it("says nothing of a pending part there is none of, that a balance never expires, and no expiry of no balance", () => {
    expect(cashbackTabViewOf({ ...cashback, pendingCents: 0 }, null, context).pending).toBeNull()
    expect(cashbackTabViewOf({ ...cashback, nextExpiry: null }, null, context).expiry).toBe("Seu saldo não vence.")
    expect(cashbackTabViewOf({ ...cashback, balanceCents: 0, nextExpiry: null }, null, context).expiry).toBeNull()
  })

  it("names each credit by its order or as the shop's own, with what is left of it and until when", () => {
    const view = cashbackTabViewOf(cashback, null, context)

    expect(view.credits.map((credit) => [credit.origin, plain(credit.amount), plain(credit.left), credit.when])).toEqual([
      ["Pedido nº 12", "R$ 3,00", "Restam R$ 3,00 de R$ 5,00", "Vence em 10/11/2026"],
      ["Crédito da loja", "R$ 5,00", null, "Não vence"],
      ["Pedido nº 14", "R$ 5,99", null, "Liberado quando o pedido for entregue"],
    ])
  })

  /** The shopkeeper's reason for an adjustment never reaches the shopper: the API leaves it out, and the line says "Ajuste da loja". */
  it("writes the statement signed, the newest first as it came, each on the shop's own day", () => {
    const view = cashbackTabViewOf(cashback, null, context)

    expect(view.entries.map((entry) => [entry.label, entry.detail, plain(entry.amount), entry.positive, entry.date])).toEqual([
      ["Ajuste da loja", null, "+ R$ 5,00", true, "02/10/2026"],
      // 02:30 UTC is still the evening before in São Paulo.
      ["Usado", "Pedido nº 13", "− R$ 2,00", false, "01/10/2026"],
      ["Ganho", "Pedido nº 12", "+ R$ 5,00", true, "01/10/2026"],
    ])
  })

  it("says the shop's rule while its cashback is on, with the minimum when it has one", () => {
    expect(cashbackTabViewOf(cashback, null, context).rule).toBeNull()
    expect(cashbackTabViewOf(cashback, { rateBps: 500, minSubtotalCents: 0 }, context).rule).toBe("Nesta loja, 5% do valor dos produtos volta como cashback quando o pedido é entregue.")
    expect(plain(cashbackTabViewOf(cashback, { rateBps: 250, minSubtotalCents: 5000 }, context).rule)).toBe(
      "Nesta loja, 2,5% do valor dos produtos volta como cashback quando o pedido é entregue, em pedidos a partir de R$ 50,00.",
    )
  })
})

describe("cashbackPageOf", () => {
  it("reads the page an address names, the first when it names none, and never one past the API's last", () => {
    expect(cashbackPageOf("3")).toBe(3)
    expect(cashbackPageOf(undefined)).toBe(1)
    expect(cashbackPageOf("abc")).toBe(1)
    expect(cashbackPageOf("999999")).toBe(CASHBACK_PAGE_MAX)
  })
})
