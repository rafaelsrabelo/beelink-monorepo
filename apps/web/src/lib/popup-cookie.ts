/**
 * That somebody closed a shop's first-purchase pop-up (BEELINK-306), as the `bl_popup` cookie holds
 * it: the version number of the notice they closed, and nothing else — not who they are, not when.
 *
 * The pop-up has two notices (BEELINK-310): the invitation a visitor reads, and the coupon a
 * signed-in customer who never ordered reads. Each numbers its own versions from the pop-up's
 * revision: the invitation at revision `r` is version `r`; the coupon's notice at the same revision
 * is version `CUSTOMER_NOTICE_BASE + r`. One whole number, so the cookie still holds only a
 * notice's version number, as the privacy policy says — which notice it was is a fact about the
 * notice, and nothing about the person. And a cookie written before there were two — a plain
 * revision — reads exactly as it was meant: the invitation, closed.
 *
 * Ours, and on `path=/<slug>` like the cart: every shop lives on one domain, and closing one shop's
 * pop-up says nothing of another's. Plain text and not `httpOnly`, for the cart's reasons: the
 * server reads it to leave the pop-up out of the page, and the page writes it at the click.
 *
 * It is no tracking and waits for no consent: it is a choice about the page, remembered, like the
 * postcode. It is written only where a pop-up was shown — a shop with none never sets it. It is the
 * browser's and not the account's: nothing is kept of who closed it.
 */

export const POPUP_COOKIE = "bl_popup"

/** Thirty days: then the shop may call again. The privacy policy says this number; a change here is a new version of that text. */
export const POPUP_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/** Whom a notice speaks to: a visitor with no account, or a signed-in customer who never ordered. */
export type PopupNotice = "VISITOR" | "CUSTOMER"

/** Where the customer's notice starts counting its versions. A count of a shopkeeper's edits never gets near it. */
export const CUSTOMER_NOTICE_BASE = 1_000_000_000

/** What a cookie says was closed: which notice, at which revision of the pop-up. */
export interface PopupSeen {
  notice: PopupNotice
  revision: number
}

/** The number the cookie holds for a notice at a revision. */
export function popupNoticeVersion(notice: PopupNotice, revision: number): number {
  return notice === "CUSTOMER" ? CUSTOMER_NOTICE_BASE + revision : revision
}

/**
 * The notice a cookie says was closed, or null for none. A cookie is the visitor's to edit, so
 * anything that is not a whole number in one of the two ranges is "never closed" — and no edit
 * makes a number that overflows.
 */
export function decodePopupSeen(raw: string | undefined): PopupSeen | null {
  if (raw === undefined || !/^[1-9]\d{0,9}$/.test(raw)) return null
  const version = Number(raw)
  if (version < CUSTOMER_NOTICE_BASE) return { notice: "VISITOR", revision: version }
  return version > CUSTOMER_NOTICE_BASE && version < 2 * CUSTOMER_NOTICE_BASE ? { notice: "CUSTOMER", revision: version - CUSTOMER_NOTICE_BASE } : null
}

/**
 * Whether this browser already closed a notice of the pop-up as it stands. A revision only counts
 * up, so one closed at or past the current one is this pop-up; a pop-up whose picture, words or
 * benefit changed since is another, and may be shown once.
 *
 * The two notices are steps of one call. Closing the invitation does not close the coupon's: to
 * somebody who then opens their account the code is news, and the moment the invitation was for.
 * Closing the coupon's closes both: it is the one that says more, and whoever read it is not
 * invited again after signing out.
 */
export function popupSeen(seen: PopupSeen | null, notice: PopupNotice, revision: number): boolean {
  if (seen === null || seen.revision < revision) return false
  return notice === "VISITOR" || seen.notice === "CUSTOMER"
}

/** The `Set-Cookie` a page writes: scoped to the shop, so two shops on one domain keep two memories. */
export function popupCookieOf(slug: string, notice: PopupNotice, revision: number, secure: boolean): string {
  return `${POPUP_COOKIE}=${popupNoticeVersion(notice, revision)}; Path=/${slug}; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax${secure ? "; Secure" : ""}`
}
