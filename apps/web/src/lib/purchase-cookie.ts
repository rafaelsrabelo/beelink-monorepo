/**
 * The orders whose purchase this browser already told a shop's pixel (BEELINK-273), as the
 * `bl_purchases` cookie holds them: what keeps a page read again, an order opened next day or a
 * second tab from telling it twice. Meta counting an event once by its id is for one told from the
 * browser and from the server; it is not what stops the same browser saying it again.
 *
 * On `path=/<slug>` and plain text, like the visitor's answer it depends on: it is written by the
 * page, and only once a purchase was really told — so never for a visitor who did not say yes.
 * Order ids alone, which name nothing to anyone but the shop.
 */

export const PURCHASES_COOKIE = "bl_purchases"

/**
 * Twenty orders, the latest kept. A purchase is told only in the day after it counted
 * (`PURCHASE_TOLD_WITHIN_MS`), so one pushed out is one that would be told again only by a browser
 * that bought more than twenty times at one shop that day.
 */
export const PURCHASES_KEPT = 20

/** Seven days, renewed at every purchase told: well past the day in which an order can still be told. */
export const PURCHASES_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const PACKED = /^[0-9a-f]{32}$/

/** An order's id as the cookie writes it: lower case, without its dashes. Null for what is not one. */
function pack(orderId: string): string | null {
  const id = orderId.toLowerCase()
  return UUID.test(id) ? id.replaceAll("-", "") : PACKED.test(id) ? id : null
}

/** What a cookie holds, oldest first. A cookie is the visitor's to edit: what is not an id is dropped. */
export function decodePurchases(raw: string | undefined): string[] {
  return raw ? raw.split(".").filter((id) => PACKED.test(id)).slice(-PURCHASES_KEPT) : []
}

/** The orders told, read from a `document.cookie` string. */
export function purchasesFromCookies(cookies: string): string[] {
  const pair = cookies.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith(`${PURCHASES_COOKIE}=`))
  return decodePurchases(pair?.slice(PURCHASES_COOKIE.length + 1))
}

export function wasPurchaseTold(told: readonly string[], orderId: string): boolean {
  const id = pack(orderId)
  return id !== null && told.includes(id)
}

/** One more order told, the oldest let go past the bound. */
export function rememberPurchase(told: readonly string[], orderId: string): string[] {
  const id = pack(orderId)
  if (id === null) return [...told]

  return [...told.filter((kept) => kept !== id), id].slice(-PURCHASES_KEPT)
}

/** The `Set-Cookie` a page writes: scoped to the shop, like the answer that allowed the telling. */
export function purchasesCookieOf(slug: string, told: readonly string[], secure: boolean): string {
  return `${PURCHASES_COOKIE}=${told.join(".")}; Path=/${slug}; Max-Age=${PURCHASES_MAX_AGE_SECONDS}; SameSite=Lax${secure ? "; Secure" : ""}`
}
