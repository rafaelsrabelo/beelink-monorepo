import "server-only"

// Next
import { cookies } from "next/headers"

// App
// Types
import type { PublicProductDetail } from "@harness-monorepo/contracts"

import { CART_COOKIE, decodeCart, type CartLine } from "./cart-cookie"
import { cartViewOf } from "./cart-view"
import { cartProductsAt } from "./storefront-data"

/**
 * The cart of the shop this request is for. The cookie is scoped to `/<slug>`, so the browser only
 * sends a shop's own: nothing here has to pick one out.
 */
export async function cartLinesAt(): Promise<CartLine[]> {
  return decodeCart((await cookies()).get(CART_COOKIE)?.value)
}

export interface ServedCart {
  lines: CartLine[]
  products: PublicProductDetail[]
  /** Lines whose product or combination the shop no longer sells. */
  gone: number
}

/** The cart page's data: the cookie's lines and the products they name, as the catalogue has them. */
export async function cartAt(slug: string): Promise<ServedCart> {
  const lines = await cartLinesAt()
  // A kit's products too: its line reads their names and whether each can still be ordered.
  const products = await cartProductsAt(slug, [...new Set(lines.flatMap((line) => [line.productId, ...(line.kit ?? []).map((part) => part.productId)]))])

  return { lines, products, gone: cartViewOf(lines, products).gone.length }
}
