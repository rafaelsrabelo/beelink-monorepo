// Block
import type { OrderListItem } from "./order-types"

export const orders: OrderListItem[] = [
  {
    number: 12,
    status: "PREPARING",
    customer: { name: "Bia Souza", phone: "5511988887777" },
    fulfillment: "DELIVERY",
    paymentMethod: "PIX",
    // The cart's delivery, fee not agreed yet: the list says "+ frete".
    deliveryFeeCents: null,
    totalCents: 24470,
    itemsCount: 3,
    placedAt: "2026-09-25T14:30:00.000Z",
  },
  {
    number: 11,
    status: "DELIVERED",
    customer: { name: "Caio Lima", phone: null },
    fulfillment: "PICKUP",
    paymentMethod: "MONEY",
    deliveryFeeCents: 0,
    totalCents: 8990,
    itemsCount: 1,
    placedAt: "2026-09-24T10:05:00.000Z",
  },
]

/** Orders charged online, each where its money stands (BEELINK-207): paid, waiting, with none made yet, paid twice, and refunded. */
export const onlineOrders: OrderListItem[] = [
  { ...orders[0]!, number: 21, status: "RECEIVED", paymentMethod: "PIX", paymentChannel: "ONLINE", payment: { status: "RECEIVED" }, strays: 0, deliveryFeeCents: 1000 },
  { ...orders[0]!, number: 20, status: "RECEIVED", paymentMethod: "CREDIT_CARD", paymentChannel: "ONLINE", payment: { status: "PENDING" }, strays: 0, deliveryFeeCents: 1000 },
  { ...orders[0]!, number: 19, status: "ACCEPTED", paymentMethod: "PIX", paymentChannel: "ONLINE", payment: null, strays: 0 },
  { ...orders[0]!, number: 18, status: "PREPARING", paymentMethod: "PIX", paymentChannel: "ONLINE", payment: { status: "RECEIVED" }, strays: 1, deliveryFeeCents: 1000 },
  { ...orders[0]!, number: 17, status: "CANCELLED", paymentMethod: "PIX", paymentChannel: "ONLINE", payment: { status: "REFUNDED" }, strays: 0, deliveryFeeCents: 1000 },
  { ...orders[1]!, number: 16, paymentChannel: "OFFLINE", payment: null, strays: 0 },
]
