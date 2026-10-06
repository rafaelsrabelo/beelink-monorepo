// Block
import { paidAfterCancelled, paidPix, pendingPix } from "./order-payment.fixtures"
import type { OrderDetailView } from "./order-types"

export const order: OrderDetailView = {
  number: 12,
  status: "ACCEPTED",
  customer: { name: "Bia Souza", phone: "5511988887777" },
  fulfillment: "DELIVERY",
  deliveryAddress: {
    recipientName: "Bia Souza",
    zipCode: "01310-930",
    street: "Av. Paulista",
    number: "1000",
    complement: null,
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  },
  paymentMethod: "PIX",
  items: [
    { id: "i1", productName: "Whey Protein", variantLabel: "Sabor: Baunilha · Peso: 900 g", sku: "WHEY-BAU-900", unitPriceCents: 12990, quantity: 2, lineTotalCents: 25980, discountCents: 0, promotionName: null },
    { id: "i2", productName: "Coqueteleira", variantLabel: null, sku: null, unitPriceCents: 2490, quantity: 1, lineTotalCents: 2490, discountCents: 0, promotionName: null },
  ],
  subtotalCents: 28470,
  deliveryFeeCents: 1000,
  discountCents: 500,
  promotionDiscountCents: 0,
  couponDiscountCents: 0,
  coupon: null,
  cashback: null,
  cashbackUsedCents: 0,
  totalCents: 28970,
  note: "Entregar depois das 18h",
  placedAt: "2026-09-25T14:30:00.000Z",
  events: [
    { status: "ACCEPTED", actor: "SHOPKEEPER", at: "2026-09-25T14:31:00.000Z" },
  ],
}

/** The same order with a promotion on its first line, a coupon and a typed discount: 25,98 + 10,00 + 5,00 off. */
export const discountedOrder: OrderDetailView = {
  ...order,
  items: [{ ...order.items[0]!, discountCents: 2598, promotionName: "Semana do Whey" }, order.items[1]!],
  discountCents: 4098,
  promotionDiscountCents: 2598,
  couponDiscountCents: 1000,
  coupon: { code: "BEMVINDO10", kind: "FIXED" },
  totalCents: 25372,
}

/** Delivered, earning 5% of the products after their discounts — 243,72 × 5% = 12,18 — usable until late October. */
export const cashbackOrder: OrderDetailView = {
  ...discountedOrder,
  status: "DELIVERED",
  cashback: { earnedCents: 1218, rateBps: 500, status: "AVAILABLE", remainingCents: 1218, availableAt: "2026-09-26T10:00:00.000Z", expiresAt: "2026-10-26T10:00:00.000Z", unrecoveredCents: 0 },
}

/** Charged online and paid by Pix (BEELINK-207). */
export const paidOnlineOrder: OrderDetailView = { ...order, paymentChannel: "ONLINE", payment: paidPix }

/** Charged online, its Pix still to be paid. */
export const awaitingOnlineOrder: OrderDetailView = { ...order, status: "RECEIVED", paymentChannel: "ONLINE", payment: pendingPix }

/** Cancelled, and paid afterwards: the money is the shop's to give back. */
export const paidAfterCancelledOrder: OrderDetailView = { ...order, status: "CANCELLED", paymentChannel: "ONLINE", payment: paidAfterCancelled }
