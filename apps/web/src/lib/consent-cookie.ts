// Types
import type { PublicStore } from "@harness-monorepo/contracts"

// App
import { shopHomeOf, type ShopAddress } from "./shop-address"

/**
 * What a visitor answered when a shop asked whether it may track them for its ads (BEELINK-271), as
 * the `bl_consent` cookie holds it.
 *
 * Ours, and on `path=/<slug>` like the cart: every shop lives on one domain, and Meta's own `_fbp` is
 * one identifier for all of it, so the only thing that can make a yes belong to one shop is where
 * this cookie is sent. A yes given at one shop is never read at another.
 *
 * Plain text and not `httpOnly`, for the cart's reasons: the server reads it to draw the page right
 * the first time, and the page writes it at the click. It is no secret — it is an answer the visitor
 * gave, and theirs to change.
 */

export const CONSENT_COOKIE = "bl_consent"

/** One purpose today: marketing, which is the shop's Meta Pixel. A second purpose is a new value, not a reuse of these. */
export type ConsentChoice = "granted" | "denied"

/**
 * Half a year, for a yes and for a no alike: then the shop asks again. The same for both, so that
 * refusing is never the answer that has to be given more often.
 */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180

/**
 * The choice a cookie holds, or null for none. A cookie is the visitor's to edit, so anything that
 * is not exactly one of the two answers is "not asked yet" — never a yes.
 */
export function decodeConsent(raw: string | undefined): ConsentChoice | null {
  return raw === "granted" || raw === "denied" ? raw : null
}

/**
 * Whether this shop may load or send anything of its marketing for this visitor: it has a pixel
 * and the visitor said yes, here. The one place that rule is written — a cookie left from when the
 * shop had a pixel is not a yes to a shop that has none.
 */
export function marketingAllowed(store: Pick<PublicStore, "metaPixelId">, choice: ConsentChoice | null): boolean {
  // Truthy and not `!== null`: an answer kept from before the field existed has none, and that is no pixel.
  return Boolean(store.metaPixelId) && choice === "granted"
}

/**
 * The `Set-Cookie` a page writes: scoped to the shop, so two shops on one domain keep two answers —
 * and to the whole site at the shop's own domain, which is that shop's alone.
 */
export function consentCookieOf(shop: ShopAddress, choice: ConsentChoice, secure: boolean): string {
  return `${CONSENT_COOKIE}=${choice}; Path=${shopHomeOf(shop)}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure ? "; Secure" : ""}`
}
