/**
 * That somebody closed a shop's first-purchase notice, as the `bl_popup` cookie holds it: one whole
 * number saying which notice they closed, and nothing else — not who they are, not when.
 *
 * The shop has two notices (BEELINK-310): the invitation a visitor reads, and the coupon a signed-in
 * customer who never ordered reads. Each is said in two forms: the pop-up's dialog (BEELINK-306),
 * at a shop that switched it on, and the strip under the header. Closing either is remembered here
 * (BEELINK-311) — a strip closed is not drawn again on the shop's pages.
 *
 * The number, with `r` the pop-up's revision — and 0 at a shop whose pop-up is off, which serves no
 * revision at all:
 *
 * - `r`                 the invitation's dialog, closed at revision `r`;
 * - `1_000_000_000 + r` the coupon's dialog;
 * - `2_000_000_000 + r` the invitation's strip;
 * - `3_000_000_000 + r` the coupon's strip.
 *
 * The first two are what BEELINK-306 and BEELINK-310 wrote, and read exactly as they were meant.
 *
 * Ours, and on `path=/<slug>` like the cart: every shop lives on one domain, and closing one shop's
 * notice says nothing of another's. Plain text and not `httpOnly`, for the cart's reasons: the
 * server reads it to leave the notice out of the page, and the page writes it at the click.
 *
 * It is no tracking and waits for no consent: it is a choice about the page, remembered, like the
 * postcode. It is written only where a notice was shown and closed. It is the browser's and not the
 * account's: nothing is kept of who closed it.
 */

// App
import { shopHomeOf, type ShopAddress } from "./shop-address"

export const POPUP_COOKIE = "bl_popup"

/** Thirty days: then the shop may call again. The privacy policy says this number; a change here is a new version of that text. */
export const POPUP_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/** Whom a notice speaks to: a visitor with no account, or a signed-in customer who never ordered. */
export type PopupNotice = "VISITOR" | "CUSTOMER"

/** How a notice is said: the pop-up's dialog, or the strip under the header. */
export type NoticeSurface = "DIALOG" | "STRIP"

/** Where the customer's notice starts counting its versions. A count of a shopkeeper's edits never gets near it. */
export const CUSTOMER_NOTICE_BASE = 1_000_000_000

/** Where a closed strip is counted from: the invitation's, then the coupon's one base further. */
export const STRIP_NOTICE_BASE = 2 * CUSTOMER_NOTICE_BASE

/** What a cookie says was closed: which notice, in which form, at which revision of the pop-up. */
export interface PopupSeen {
  notice: PopupNotice
  surface: NoticeSurface
  /** The pop-up's revision; 0 is a strip closed at a shop with no pop-up on. */
  revision: number
}

/**
 * The four closings as steps of one call, each closing the ones before it: the invitation's dialog,
 * its strip, the coupon's dialog, its strip. The coupon's notice is the one that says more — whoever
 * closed it is not invited again after signing out — and closing a notice's strip is closing that
 * notice in every form.
 */
function stepOf(notice: PopupNotice, surface: NoticeSurface): number {
  return (notice === "CUSTOMER" ? 2 : 0) + (surface === "STRIP" ? 1 : 0)
}

/** The number the cookie holds for a notice closed at a revision, in one of its forms — the dialog's unless told. */
export function popupNoticeVersion(notice: PopupNotice, revision: number, surface: NoticeSurface = "DIALOG"): number {
  return (surface === "STRIP" ? STRIP_NOTICE_BASE : 0) + (notice === "CUSTOMER" ? CUSTOMER_NOTICE_BASE : 0) + revision
}

/**
 * The notice a cookie says was closed, or null for none. A cookie is the visitor's to edit, so
 * anything that is not a whole number in one of the four ranges is "never closed" — and no edit
 * makes a number that overflows. A dialog is never closed at revision 0: there is none to close.
 */
export function decodePopupSeen(raw: string | undefined): PopupSeen | null {
  if (raw === undefined || !/^[1-9]\d{0,9}$/.test(raw)) return null
  const version = Number(raw)
  if (version >= 4 * CUSTOMER_NOTICE_BASE) return null

  const surface: NoticeSurface = version >= STRIP_NOTICE_BASE ? "STRIP" : "DIALOG"
  const notice: PopupNotice = Math.floor(version / CUSTOMER_NOTICE_BASE) % 2 === 1 ? "CUSTOMER" : "VISITOR"
  const revision = version % CUSTOMER_NOTICE_BASE
  return surface === "DIALOG" && revision === 0 ? null : { notice, surface, revision }
}

/**
 * Whether this browser already closed a notice, in one form, as the shop's pop-up stands. A
 * revision only counts up, so one closed at or past the current one is this pop-up; a pop-up whose
 * picture, words or benefit changed since is another, and may be shown once — its strip too. A
 * shop with no pop-up on asks at revision 0, where everything ever closed there still counts:
 * closed is closed for the cookie's thirty days.
 *
 * Closing the invitation, in either form, does not close the coupon's notice: to somebody who then
 * opens their account the code is news, and the moment the invitation was for.
 */
export function noticeClosed(seen: PopupSeen | null, notice: PopupNotice, surface: NoticeSurface, revision: number): boolean {
  return seen !== null && seen.revision >= revision && stepOf(seen.notice, seen.surface) >= stepOf(notice, surface)
}

/** Whether this browser already closed a notice's dialog — or anything past it (`noticeClosed`). */
export function popupSeen(seen: PopupSeen | null, notice: PopupNotice, revision: number): boolean {
  return noticeClosed(seen, notice, "DIALOG", revision)
}

/**
 * The revision a closing is written at: the pop-up's — 0 with none on — and never one before what
 * the cookie already holds. A shop that switches its pop-up off and on again would otherwise reopen
 * what this browser closed.
 */
export function closingRevisionOf(seen: PopupSeen | null, revision: number): number {
  return Math.max(revision, seen?.revision ?? 0)
}

/** The `Set-Cookie` a page writes: scoped to the shop, so two shops on one domain keep two memories. */
export function popupCookieOf(shop: ShopAddress, notice: PopupNotice, revision: number, secure: boolean, surface: NoticeSurface = "DIALOG"): string {
  return `${POPUP_COOKIE}=${popupNoticeVersion(notice, revision, surface)}; Path=${shopHomeOf(shop)}; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax${secure ? "; Secure" : ""}`
}
