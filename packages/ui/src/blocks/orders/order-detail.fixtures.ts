// Block
import type { OrderDetailView } from "./order-types"

export const order: OrderDetailView = {
  number: 12,
  status: "ACCEPTED",
  customer: {
    name: "Bia Souza",
    phone: "5511988887777",
    address: { zipCode: "01310-930", street: "Av. Paulista", number: "1000", complement: null, neighborhood: "Bela Vista", city: "São Paulo", state: "SP" },
  },
  fulfillment: "DELIVERY",
  paymentMethod: "PIX",
  items: [
    { id: "i1", productName: "Whey Protein", variantLabel: "Sabor: Baunilha · Peso: 900 g", sku: "WHEY-BAU-900", unitPriceCents: 12990, quantity: 2, lineTotalCents: 25980 },
    { id: "i2", productName: "Coqueteleira", variantLabel: null, sku: null, unitPriceCents: 2490, quantity: 1, lineTotalCents: 2490 },
  ],
  subtotalCents: 28470,
  deliveryFeeCents: 1000,
  discountCents: 500,
  totalCents: 28970,
  note: "Entregar depois das 18h",
  placedAt: "2026-09-25T14:30:00.000Z",
  events: [
    { status: "ACCEPTED", actor: "SHOPKEEPER", at: "2026-09-25T14:31:00.000Z" },
  ],
}
