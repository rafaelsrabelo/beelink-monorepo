import "server-only"

// Next
import { cookies } from "next/headers"

// App
import { CART_COOKIE, decodeCart, type CartLine } from "./cart-cookie"

/**
 * The cart of the shop this request is for. The cookie is scoped to `/<slug>`, so the browser only
 * sends a shop's own: nothing here has to pick one out.
 */
export async function cartLinesAt(): Promise<CartLine[]> {
  return decodeCart((await cookies()).get(CART_COOKIE)?.value)
}
