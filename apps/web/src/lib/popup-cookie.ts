/**
 * That a visitor closed a shop's first-purchase pop-up (BEELINK-306), as the `bl_popup` cookie
 * holds it: the revision of the pop-up they closed, and nothing else — not who they are, not when.
 *
 * Ours, and on `path=/<slug>` like the cart: every shop lives on one domain, and closing one shop's
 * pop-up says nothing of another's. Plain text and not `httpOnly`, for the cart's reasons: the
 * server reads it to leave the pop-up out of the page, and the page writes it at the click.
 *
 * It is no tracking and waits for no consent: it is a choice about the page, remembered, like the
 * postcode. It is written only where a pop-up was shown — a shop with none never sets it.
 */

export const POPUP_COOKIE = "bl_popup"

/** Thirty days: then the shop may call again. The privacy policy says this number; a change here is a new version of that text. */
export const POPUP_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/** As far as a revision is read: a count of a shopkeeper's edits never gets near it, and an edited cookie cannot be made into a number that overflows. */
const REVISION_MAX = 1_000_000_000

/**
 * The revision a cookie says was closed, or null for none. A cookie is the visitor's to edit, so
 * anything that is not a whole number from one up is "never closed".
 */
export function decodePopupSeen(raw: string | undefined): number | null {
  if (raw === undefined || !/^[1-9]\d{0,9}$/.test(raw)) return null
  const revision = Number(raw)
  return revision <= REVISION_MAX ? revision : null
}

/**
 * Whether the pop-up as it stands was already closed by this visitor. A revision only counts up, so
 * one closed at or past the current one is this pop-up; a pop-up whose picture, words or benefit
 * changed since is another, and may be shown once.
 */
export function popupSeen(seen: number | null, revision: number): boolean {
  return seen !== null && seen >= revision
}

/** The `Set-Cookie` a page writes: scoped to the shop, so two shops on one domain keep two memories. */
export function popupCookieOf(slug: string, revision: number, secure: boolean): string {
  return `${POPUP_COOKIE}=${revision}; Path=/${slug}; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax${secure ? "; Secure" : ""}`
}
