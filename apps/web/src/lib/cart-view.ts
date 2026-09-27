// Types
import type { PublicProductDetail } from "@harness-monorepo/contracts"

// App
import type { CartLine } from "./cart-cookie"

/** One line of the cart as a shopper reads it: the cookie's ids, resolved against the catalogue. */
export interface CartRow {
  productId: string
  /** The cookie's: null on a line of a product with a single combination, saved before it had options. */
  variantId: string | null
  /** The combination an order names: the line's, or the product's only one. */
  orderVariantId: string
  name: string
  slug: string
  /** "Sabor: Chocolate · Peso: 900 g"; null for a product without options. */
  variantLabel: string | null
  imageUrl: string | null
  unitPriceCents: number
  compareAtPriceCents: number | null
  qty: number
  lineTotalCents: number
  /** False when sold out: the line stays in view, says so, and does not count towards the total. */
  available: boolean
}

export interface CartView {
  rows: CartRow[]
  /** Lines whose product or combination the shop no longer sells: the page takes them out. */
  gone: CartLine[]
  /** Only what can be ordered now. */
  subtotalCents: number
  /** Units that can be ordered now. */
  count: number
}

/**
 * The cart, priced now. Names and prices come from the catalogue on every read and never from the
 * cookie, so a price the shop changed is the price the cart shows.
 *
 * A line points at a combination; a product without options has exactly one, and a line saved
 * before the shop added options to it points at none — that one is gone rather than guessed.
 */
export function cartViewOf(lines: readonly CartLine[], products: readonly PublicProductDetail[]): CartView {
  const byId = new Map(products.map((product) => [product.id, product]))
  const rows: CartRow[] = []
  const gone: CartLine[] = []

  for (const line of lines) {
    const product = byId.get(line.productId)
    const variant = product?.variants.find((entry) => (line.variantId ? entry.id === line.variantId : product.variants.length === 1))

    if (!product || !variant) {
      gone.push(line)
      continue
    }

    const values = new Map(product.options.flatMap((option) => option.values.map((value) => [value.id, { option: option.name, value: value.name }])))
    const label = variant.optionValueIds
      .map((id) => values.get(id))
      .filter((entry) => entry !== undefined)
      .map((entry) => `${entry.option}: ${entry.value}`)
      .join(" · ")
    const available = !product.soldOut && variant.available

    rows.push({
      productId: line.productId,
      variantId: line.variantId,
      orderVariantId: variant.id,
      name: product.name,
      slug: product.slug,
      variantLabel: label || null,
      imageUrl: variant.imageUrl ?? product.imageUrl,
      unitPriceCents: variant.priceCents,
      compareAtPriceCents: variant.compareAtPriceCents,
      qty: line.qty,
      lineTotalCents: variant.priceCents * line.qty,
      available,
    })
  }

  const orderable = rows.filter((row) => row.available)

  return {
    rows,
    gone,
    subtotalCents: orderable.reduce((sum, row) => sum + row.lineTotalCents, 0),
    count: orderable.reduce((sum, row) => sum + row.qty, 0),
  }
}

/**
 * The lines an order is placed with: what can be ordered now, one line per combination — two cookie
 * lines naming the same one, as a line saved before a product had options can, are added up rather
 * than sent twice, which the API would refuse.
 */
export function orderItemsOf(rows: readonly CartRow[]): { variantId: string; quantity: number }[] {
  const quantities = new Map<string, number>()
  for (const row of rows) {
    if (row.available) quantities.set(row.orderVariantId, (quantities.get(row.orderVariantId) ?? 0) + row.qty)
  }
  return [...quantities].map(([variantId, quantity]) => ({ variantId, quantity }))
}

/** The key a row is known by, in the page and in its controls. */
export function rowKeyOf(row: Pick<CartLine, "productId" | "variantId">): string {
  return `${row.productId}:${row.variantId ?? ""}`
}

