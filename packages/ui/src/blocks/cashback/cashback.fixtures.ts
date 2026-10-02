// Block
import type { CashbackOwedView, CashbackSettingsFormValues, CustomerCashbackView } from "@harness-monorepo/ui/lib/cashback"

/** 5% back, for 90 days, from R$ 50,00, credit paying up to half an order. */
export const settings: CashbackSettingsFormValues = { enabled: true, rate: "5", validity: "DAYS", validityDays: "90", minimum: "50,00", maxRedeem: "50" }

export const owed: CashbackOwedView = { availableCents: 184_350, pendingCents: 42_190, expiringSoonCents: 12_800, expiringSoonDays: 30 }

/** Earned on order 31, spent part on order 34, and an adjustment by hand. */
export const customer: CustomerCashbackView = {
  balanceCents: 1450,
  pendingCents: 620,
  nextExpiry: { amountCents: 950, expiresAt: "2026-11-02T13:00:00.000Z" },
  entries: [
    { id: "e4", kind: "ADJUST", amountCents: 500, orderNumber: null, reason: "Pedido entregue com atraso", createdAt: "2026-10-01T15:00:00.000Z" },
    { id: "e3", kind: "REDEEM", amountCents: -800, orderNumber: 34, reason: null, createdAt: "2026-09-28T18:20:00.000Z" },
    { id: "e2", kind: "EARN", amountCents: 1750, orderNumber: 31, reason: null, createdAt: "2026-09-20T12:00:00.000Z" },
  ],
}
