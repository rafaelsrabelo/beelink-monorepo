// Types
import type { PublicProductDetail } from "@harness-monorepo/contracts"

// App
import { kitKeyOf, type CartKitPart, type CartLine } from "./cart-cookie"

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
  /**
   * On a kit's line (plan 2026-11-10--kits-monte-seu-kit): the cookie's products, as the line is
   * named, and the combination of each, as the order sends it. Its `variantLabel` says them in words.
   */
  kit?: { parts: readonly CartKitPart[]; order: { variantId: string; quantity: number }[] }
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
    // A kit's line is the kit and every product chosen for it: one gone, or now sold in combinations, is the whole kit gone.
    const kit = line.kit?.length ? kitOf(line.kit, byId) : null

    if (!product || !variant || (line.kit?.length && !kit)) {
      gone.push(line)
      continue
    }

    const values = new Map(product.options.flatMap((option) => option.values.map((value) => [value.id, { option: option.name, value: value.name }])))
    const label = variant.optionValueIds
      .map((id) => values.get(id))
      .filter((entry) => entry !== undefined)
      .map((entry) => `${entry.option}: ${entry.value}`)
      .join(" · ")
    const available = !product.soldOut && variant.available && (kit?.available ?? true)

    rows.push({
      productId: line.productId,
      variantId: line.variantId,
      orderVariantId: variant.id,
      name: product.name,
      slug: product.slug,
      variantLabel: kit?.label ?? (label || null),
      imageUrl: variant.imageUrl ?? product.imageUrl,
      unitPriceCents: variant.priceCents,
      compareAtPriceCents: variant.compareAtPriceCents,
      qty: line.qty,
      lineTotalCents: variant.priceCents * line.qty,
      available,
      ...(kit && line.kit ? { kit: { parts: line.kit, order: kit.order } } : {}),
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
 * than sent twice, which the API would refuse. A kit's line is one per choice of products, and goes
 * with them.
 */
export function orderItemsOf(rows: readonly CartRow[]): { variantId: string; quantity: number; kit?: { variantId: string; quantity: number }[] }[] {
  const lines = new Map<string, { variantId: string; quantity: number; kit?: { variantId: string; quantity: number }[] }>()
  for (const row of rows) {
    if (!row.available) continue
    const key = `${row.orderVariantId}|${kitKeyOf(row.kit?.parts)}`
    const now = lines.get(key)
    lines.set(key, { variantId: row.orderVariantId, quantity: (now?.quantity ?? 0) + row.qty, ...(row.kit ? { kit: row.kit.order } : {}) })
  }
  return [...lines.values()]
}

/** The key a row is known by, in the page and in its controls: a kit's, with what is in it. */
export function rowKeyOf(row: Pick<CartLine, "productId" | "variantId"> & { kit?: { parts: readonly CartKitPart[] } }): string {
  const kit = kitKeyOf(row.kit?.parts)
  return kit ? `${row.productId}:${row.variantId ?? ""}:${kit}` : `${row.productId}:${row.variantId ?? ""}`
}

/**
 * A kit's products, as the catalogue has them now: each a product of one combination — the only kind
 * a kit takes from the shop window — said in words for the line, and as the order sends them. Null
 * when any is gone, or sells combinations now.
 */
function kitOf(parts: readonly CartKitPart[], byId: ReadonlyMap<string, PublicProductDetail>): { label: string; available: boolean; order: { variantId: string; quantity: number }[] } | null {
  const read = parts.map((part) => {
    const product = byId.get(part.productId)
    const variant = product && product.variants.length === 1 ? product.variants[0]! : null
    return product && variant ? { part, product, variant } : null
  })
  if (read.some((entry) => entry === null)) return null
  const chosen = read as { part: CartKitPart; product: PublicProductDetail; variant: PublicProductDetail["variants"][number] }[]

  return {
    label: chosen.map(({ part, product }) => `${part.qty}× ${product.name}`).join(" · "),
    available: chosen.every(({ product, variant }) => !product.soldOut && variant.available),
    order: chosen.map(({ part, variant }) => ({ variantId: variant.id, quantity: part.qty })),
  }
}

