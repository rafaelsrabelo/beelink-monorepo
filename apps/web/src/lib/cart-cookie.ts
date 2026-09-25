/**
 * The cart as the `bl_cart` cookie holds it: ids and quantities, nothing a shopper reads. Names and
 * prices come from the catalogue, which is cached already, so a price never goes stale in a cookie
 * and the cookie stays under the browser's 4 KB with room to spare.
 *
 * It is plain text on purpose, readable by the server and the browser alike: a Server Component can
 * draw the cart in the HTML, and the page's store writes it back on every change. Nothing here is a
 * secret — the cookie is not `httpOnly`, and it never holds more than a shopper could type.
 */

export const CART_COOKIE = "bl_cart"
/** Fifty lines: at 32 characters an id, the most that still sits well under 4 KB. */
export const CART_MAX_LINES = 50
export const CART_MAX_QTY = 99
/** Thirty days, renewed on every change: a cart left for a month is a cart abandoned. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export interface CartLine {
  productId: string
  /** The combination chosen, for a product with options; null for one without. */
  variantId: string | null
  qty: number
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PACKED = /^[0-9a-f]{32}$/i
const SAFE = /^[A-Za-z0-9_-]+$/

/** A UUID without its dashes — four bytes saved an id, a line's worth every twelve lines. */
function pack(id: string): string {
  return UUID.test(id) ? id.replaceAll("-", "") : id
}

function unpack(id: string): string {
  return PACKED.test(id) ? `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}` : id
}

export function sameLine(line: Pick<CartLine, "productId" | "variantId">, productId: string, variantId: string | null): boolean {
  return line.productId === productId && line.variantId === variantId
}

/** `product.variant.qty`, joined by `~`: characters a cookie carries without escaping. */
export function encodeCart(lines: readonly CartLine[]): string {
  return lines
    .slice(0, CART_MAX_LINES)
    .map((line) => `${pack(line.productId)}.${line.variantId ? pack(line.variantId) : ""}.${line.qty}`)
    .join("~")
}

/**
 * Whatever the cookie holds, as lines. A cookie is the shopper's to edit, so anything malformed is
 * dropped rather than trusted: a bad entry costs that entry, never the cart.
 */
export function decodeCart(raw: string | undefined): CartLine[] {
  if (!raw) return []

  let lines: CartLine[] = []
  for (const entry of raw.split("~")) {
    const [product = "", variant = "", quantity = ""] = entry.split(".")
    const qty = Number(quantity)
    if (!SAFE.test(product) || (variant && !SAFE.test(variant)) || !Number.isInteger(qty) || qty < 1) continue

    lines = addLine(lines, { productId: unpack(product), variantId: variant ? unpack(variant) : null, qty })
  }
  return lines
}

/** One more of a line: the same product and combination adds up, a new one is a new line. */
export function addLine(lines: readonly CartLine[], line: CartLine): CartLine[] {
  const at = lines.findIndex((entry) => sameLine(entry, line.productId, line.variantId))

  if (at >= 0) {
    return lines.map((entry, index) => (index === at ? { ...entry, qty: Math.min(entry.qty + line.qty, CART_MAX_QTY) } : entry))
  }
  if (lines.length >= CART_MAX_LINES) return [...lines]

  return [...lines, { ...line, qty: Math.min(Math.max(line.qty, 1), CART_MAX_QTY) }]
}

/** A line set to a quantity; zero or less takes it out. */
export function setLineQty(lines: readonly CartLine[], productId: string, variantId: string | null, qty: number): CartLine[] {
  if (qty < 1) return lines.filter((entry) => !sameLine(entry, productId, variantId))

  return lines.map((entry) => (sameLine(entry, productId, variantId) ? { ...entry, qty: Math.min(Math.trunc(qty), CART_MAX_QTY) } : entry))
}

/** Every unit in the cart, which is what the header's badge counts. */
export function countOf(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty, 0)
}

/** The `Set-Cookie` a page writes: scoped to the shop, so two shops on one domain keep two carts. */
export function cartCookieOf(slug: string, lines: readonly CartLine[], secure: boolean): string {
  const value = encodeCart(lines)
  const age = value ? MAX_AGE_SECONDS : 0

  return `${CART_COOKIE}=${value}; Path=/${slug}; Max-Age=${age}; SameSite=Lax${secure ? "; Secure" : ""}`
}
