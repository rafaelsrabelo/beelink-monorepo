// Block
import { formatCents } from "../storefront/storefront-price"
import type { OrderCustomerOption, OrderFormLine, OrderProductOption, OrderVariantOption } from "@harness-monorepo/ui/lib/order-form"

export const customers: OrderCustomerOption[] = [
  { id: "c1", name: "Bia Souza", phone: "5511988887777", email: "bia@exemplo.com" },
  { id: "c2", name: "Bianca Lima", phone: "5521977776666", email: null },
]

export const products: OrderProductOption[] = [
  { id: "p1", name: "Whey Protein", imageUrl: null, priceCents: 12990, sku: "WHEY" },
  { id: "p2", name: "Coqueteleira", imageUrl: null, priceCents: 2490, sku: null },
]

export const variants: OrderVariantOption[] = [
  { id: "v1", label: "Sabor: Baunilha · Peso: 900 g", priceCents: 12990, sku: "WHEY-BAU-900", outOfStock: false, available: 12 },
  { id: "v2", label: "Sabor: Chocolate · Peso: 900 g", priceCents: 13490, sku: "WHEY-CHO-900", outOfStock: true, available: 0 },
]

export const lines: OrderFormLine[] = [
  { variantId: "v1", productName: "Whey Protein", variantLabel: "Sabor: Baunilha · Peso: 900 g", unitPriceCents: 12990, quantity: 2, available: 12 },
  { variantId: "v3", productName: "Coqueteleira", variantLabel: null, unitPriceCents: 2490, quantity: 1, available: 0 },
]

export const money = (cents: number) => formatCents(cents, "pt-BR", "BRL")
