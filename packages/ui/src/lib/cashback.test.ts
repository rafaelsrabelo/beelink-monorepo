// Libs
import { describe, expect, it } from "vitest"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// Lib
import { customerCashbackLineOf, earnedOnPrice } from "./cashback"

describe("earnedOnPrice (BEELINK-243)", () => {
  it("is the rate over the price, rounded down as the API rounds an order", () => {
    expect(earnedOnPrice(10_099, { rateBps: 500, minSubtotalCents: 0 })).toBe(504)
  })

  it("earns nothing under the minimum, or under a cent", () => {
    expect(earnedOnPrice(4_999, { rateBps: 500, minSubtotalCents: 5_000 })).toBeNull()
    expect(earnedOnPrice(99, { rateBps: 1, minSubtotalCents: 0 })).toBeNull()
  })
})

describe("customerCashbackLineOf", () => {
  const options = { money: (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`, date: (iso: string) => iso.slice(0, 10), now: new Date("2026-11-01T12:00:00.000Z"), text: ptBR.storefront.orderCashback }
  const lot = { earnedCents: 500, status: "AVAILABLE" as const, remainingCents: 500, expiresAt: "2026-12-30T12:00:00.000Z" }

  it("says what will come once delivered, what can be spent and until when", () => {
    expect(customerCashbackLineOf({ ...lot, status: "PENDING", expiresAt: null }, options)).toBe("Você vai ganhar R$ 5,00 de cashback quando o pedido for entregue.")
    expect(customerCashbackLineOf(lot, options)).toBe("R$ 5,00 de cashback para usar até 2026-12-30.")
    expect(customerCashbackLineOf({ ...lot, expiresAt: null }, options)).toBe("R$ 5,00 de cashback para usar nas próximas compras.")
  })

  it("says it was spent, reversed or expired — expired once past its day, before any sweep", () => {
    expect(customerCashbackLineOf({ ...lot, remainingCents: 0 }, options)).toBe("Você já usou o cashback deste pedido.")
    expect(customerCashbackLineOf({ ...lot, status: "VOIDED", remainingCents: 0 }, options)).toBe("O cashback deste pedido foi estornado.")
    expect(customerCashbackLineOf({ ...lot, expiresAt: "2026-10-30T12:00:00.000Z" }, options)).toBe("O cashback deste pedido venceu.")
    expect(customerCashbackLineOf(null, options)).toBeNull()
  })
})
