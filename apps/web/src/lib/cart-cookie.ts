/**
 * The cart as the `bl_cart` cookie holds it: ids and quantities, nothing a shopper reads. Names and
 * prices come from the catalogue, which is cached already, so a price never goes stale in a cookie
 * and the cookie stays under the browser's 4 KB with room to spare.
 *
 * It is plain text on purpose, readable by the server and the browser alike: a Server Component can
 * draw the cart in the HTML, and the page's store writes it back on every change. Nothing here is a
 * secret — the cookie is not `httpOnly`, and it never holds more than a shopper could type.
 */

// App
import { shopHomeOf, type ShopAddress } from "./shop-address"

export const CART_COOKIE = "bl_cart"
/** Fifty lines: at 32 characters an id, the most that still sits well under 4 KB. */
export const CART_MAX_LINES = 50
export const CART_MAX_QTY = 99
/**
 * What the cookie's value may grow to: a browser drops a cookie past 4 KB, and the whole cart with it.
 * Kits are what can reach it — a kit's line carries its products — so a line that would pass it is not added.
 */
const COOKIE_BUDGET = 3800
/** Thirty days, renewed on every change: a cart left for a month is a cart abandoned. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export interface CartLine {
  productId: string
  /** The combination chosen, for a product with options; null for one without. */
  variantId: string | null
  qty: number
  /**
   * On a kit's line (plan 2026-11-10--kits-monte-seu-kit): the products chosen for each kit, by
   * product — each a product of one combination, which the catalogue resolves — and how many of
   * each. Two kits with other products in them are two lines. Absent on any other line.
   */
  kit?: CartKitPart[]
}

export interface CartKitPart {
  productId: string
  qty: number
}

/** The most products one kit holds, and the most of one: the API's own ceiling. */
const KIT_MAX = 99

/** What a kit's line is told apart by: its products in one order, so the same choice is the same line however it was made. */
export function kitKeyOf(kit: readonly CartKitPart[] | undefined): string {
  if (!kit?.length) return ""
  return [...kit].sort((a, b) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0)).map((part) => `${part.productId}*${part.qty}`).join("_")
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

export function sameLine(line: Pick<CartLine, "productId" | "variantId" | "kit">, productId: string, variantId: string | null, kit?: readonly CartKitPart[]): boolean {
  return line.productId === productId && line.variantId === variantId && kitKeyOf(line.kit) === kitKeyOf(kit)
}

/**
 * `product.variant.qty`, joined by `~`: characters a cookie carries without escaping. A kit's line
 * adds its products as a fourth part, `product*qty` joined by `_` — no comma, which a cookie's value
 * may not hold.
 */
export function encodeCart(lines: readonly CartLine[]): string {
  return lines
    .slice(0, CART_MAX_LINES)
    .map((line) => {
      const head = `${pack(line.productId)}.${line.variantId ? pack(line.variantId) : ""}.${line.qty}`
      return line.kit?.length ? `${head}.${line.kit.map((part) => `${pack(part.productId)}*${part.qty}`).join("_")}` : head
    })
    .join("~")
}

/** A kit's products as the cookie wrote them; null when any of them is not something a cookie this page wrote would hold. */
function kitOf(raw: string): CartKitPart[] | null {
  const parts: CartKitPart[] = []
  for (const entry of raw.split("_")) {
    const [product = "", quantity = ""] = entry.split("*")
    const qty = Number(quantity)
    if (!SAFE.test(product) || !Number.isInteger(qty) || qty < 1 || qty > KIT_MAX) return null
    parts.push({ productId: unpack(product), qty })
  }
  return parts.length && parts.length <= KIT_MAX ? parts : null
}

/**
 * Whatever the cookie holds, as lines. A cookie is the shopper's to edit, so anything malformed is
 * dropped rather than trusted: a bad entry costs that entry, never the cart.
 */
export function decodeCart(raw: string | undefined): CartLine[] {
  if (!raw) return []

  let lines: CartLine[] = []
  for (const entry of raw.split("~")) {
    const [product = "", variant = "", quantity = "", parts] = entry.split(".")
    const qty = Number(quantity)
    if (!SAFE.test(product) || (variant && !SAFE.test(variant)) || !Number.isInteger(qty) || qty < 1) continue
    // A kit whose products do not read is dropped whole: a kit with part of what was chosen is another kit.
    const kit = parts === undefined ? null : kitOf(parts)
    if (parts !== undefined && !kit) continue

    lines = addLine(lines, { productId: unpack(product), variantId: variant ? unpack(variant) : null, qty, ...(kit ? { kit } : {}) })
  }
  return lines
}

/** One more of a line: the same product and combination — and, of a kit, the same products in it — adds up, a new one is a new line. */
export function addLine(lines: readonly CartLine[], line: CartLine): CartLine[] {
  const at = lines.findIndex((entry) => sameLine(entry, line.productId, line.variantId, line.kit))

  if (at >= 0) {
    return lines.map((entry, index) => (index === at ? { ...entry, qty: Math.min(entry.qty + line.qty, CART_MAX_QTY) } : entry))
  }
  if (lines.length >= CART_MAX_LINES) return [...lines]

  const added = [...lines, { ...line, qty: Math.min(Math.max(line.qty, 1), CART_MAX_QTY) }]
  return encodeCart(added).length > COOKIE_BUDGET ? [...lines] : added
}

/** A line set to a quantity; zero or less takes it out. A kit's line is named with what is in it. */
export function setLineQty(lines: readonly CartLine[], productId: string, variantId: string | null, qty: number, kit?: readonly CartKitPart[]): CartLine[] {
  if (qty < 1) return lines.filter((entry) => !sameLine(entry, productId, variantId, kit))

  return lines.map((entry) => (sameLine(entry, productId, variantId, kit) ? { ...entry, qty: Math.min(Math.trunc(qty), CART_MAX_QTY) } : entry))
}

/** Every unit in the cart, which is what the header's badge counts. */
export function countOf(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty, 0)
}

/**
 * The `Set-Cookie` a page writes: scoped to the shop, so two shops on one domain keep two carts —
 * and to the whole site at the shop's own domain, where the cart's page is `/carrinho`.
 */
export function cartCookieOf(shop: ShopAddress, lines: readonly CartLine[], secure: boolean): string {
  const value = encodeCart(lines)
  const age = value ? MAX_AGE_SECONDS : 0

  return `${CART_COOKIE}=${value}; Path=${shopHomeOf(shop)}; Max-Age=${age}; SameSite=Lax${secure ? "; Secure" : ""}`
}
