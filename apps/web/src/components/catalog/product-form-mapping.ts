// React
import type { ComponentProps } from "react"

// Types
import type { Product, UpdateProductPayload } from "@harness-monorepo/contracts"

// UI
import type { ProductEditor } from "@harness-monorepo/ui/blocks/catalog/product-editor"
import { centsFrom, centsFromStrict, reaisFrom } from "@harness-monorepo/ui/lib/money"

// App
import { percentFrom } from "@/lib/discount-form"

/**
 * Read off the block rather than imported: `@harness-monorepo/ui/blocks/*` serves `.tsx`, so the
 * types beside a block are not reachable from here — and deriving them means this file cannot
 * drift from what the editor actually accepts.
 */
export type FormValues = ComponentProps<typeof ProductEditor>["value"]
export type FormIssues = NonNullable<ComponentProps<typeof ProductEditor>["errors"]>

/** What "new" looks like. It belongs to the screen: the design system has no empty product. */
export const EMPTY_FORM: FormValues = {
  name: "",
  slug: "",
  description: "",
  price: "",
  compareAtPrice: "",
  cost: "",
  cashback: "",
  categoryId: "",
  status: "ACTIVE",
  origin: "",
  imageUrls: [],
  sku: "",
  barcode: "",
  trackStock: false,
  stock: "",
  weight: "",
  length: "",
  width: "",
  height: "",
}

/** Centimetres as a person types them, millimetres on the wire. Null for an empty field. */
export function millimetres(typed: string): number | null {
  const value = Number(typed.replace(",", "."))
  return typed.trim() && Number.isFinite(value) ? Math.round(value * 10) : null
}

export function whole(typed: string): number | null {
  const value = Number(typed.replace(/\D/g, ""))
  return typed.trim() && Number.isFinite(value) ? value : null
}

export function toForm(product: Product): FormValues {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    price: reaisFrom(product.priceCents),
    compareAtPrice: reaisFrom(product.compareAtPriceCents),
    cost: reaisFrom(product.costCents),
    cashback: product.cashbackRateBps === null ? "" : percentFrom(product.cashbackRateBps),
    categoryId: product.category?.id ?? "",
    status: product.status,
    origin: product.origin ?? "",
    imageUrls: product.images.map((image) => image.url),
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    trackStock: product.trackStock,
    stock: product.stockQuantity === null ? "" : String(product.stockQuantity),
    weight: product.weightGrams === null ? "" : String(product.weightGrams),
    length: product.lengthMm === null ? "" : String(product.lengthMm / 10),
    width: product.widthMm === null ? "" : String(product.widthMm / 10),
    height: product.heightMm === null ? "" : String(product.heightMm / 10),
  }
}

/**
 * The product's own cashback as the wire takes it (BEELINK-313): "2,5" is 250 basis points, and an
 * empty field is none. `undefined` is a percentage that does not hold — the form says so, and nothing is sent.
 */
export function cashbackRateOf(typed: string): number | null | undefined {
  if (typed.trim() === "") return null
  const bps = centsFromStrict(typed)
  return bps !== null && bps >= 1 && bps <= 10_000 ? bps : undefined
}

/** What describes the product itself, whatever its variations. */
export function fieldsOf(value: FormValues): UpdateProductPayload {
  return {
    cashbackRateBps: cashbackRateOf(value.cashback),
    name: value.name.trim(),
    slug: value.slug.trim() || undefined,
    description: value.description.trim() || null,
    categoryId: value.categoryId || null,
    status: value.status,
    origin: value.origin || null,
    images: value.imageUrls.map((url: string) => ({ url })),
  }
}

/** What belongs to a sellable unit: the product's own, or its one variant's, when it has no options. */
export function perUnitOf(value: FormValues, priceCents: number): UpdateProductPayload {
  return {
    priceCents,
    compareAtPriceCents: centsFrom(value.compareAtPrice),
    costCents: centsFrom(value.cost),
    sku: value.sku.trim() || null,
    barcode: value.barcode.trim() || null,
    trackStock: value.trackStock,
    stockQuantity: value.trackStock ? whole(value.stock) : null,
    ...shippingOf(value),
  }
}

/** The weight and the box of a product that sells one thing. */
export function shippingOf(value: FormValues): Pick<UpdateProductPayload, "weightGrams" | "lengthMm" | "widthMm" | "heightMm"> {
  return { weightGrams: whole(value.weight), ...boxOf(value) }
}

/** The box alone, which a product with options gives every combination; each keeps its own weight. */
export function boxOf(value: FormValues): Pick<UpdateProductPayload, "lengthMm" | "widthMm" | "heightMm"> {
  return {
    lengthMm: millimetres(value.length),
    widthMm: millimetres(value.width),
    heightMm: millimetres(value.height),
  }
}
