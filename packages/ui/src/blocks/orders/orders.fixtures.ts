// Block
import type { OrderListItem } from "./order-types"

export const orders: OrderListItem[] = [
  {
    number: 12,
    status: "PREPARING",
    customer: { name: "Bia Souza", phone: "5511988887777" },
    fulfillment: "DELIVERY",
    paymentMethod: "PIX",
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
    totalCents: 8990,
    itemsCount: 1,
    placedAt: "2026-09-24T10:05:00.000Z",
  },
]
