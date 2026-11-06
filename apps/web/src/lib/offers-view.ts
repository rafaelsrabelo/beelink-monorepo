// Types
import type { CustomerFirstPurchaseOffer, StorefrontPopup } from "@harness-monorepo/contracts"

// App
import { closingRevisionOf, noticeClosed, type PopupNotice, type PopupSeen } from "./popup-cookie"

export interface OffersViewAsk {
  /** The shop's pop-up while it is switched on; null otherwise. */
  popup: Pick<StorefrontPopup, "revision" | "keepReminder"> | null
  /**
   * Who the page is drawn for: a browser holding a shopper's session the page could not read as one
   * (a token that ran out — BEELINK-306), told nothing; or anyone else, with the first-order benefit
   * the strip would tell them — a signed-in shopper's own, or the shop's public one to somebody with
   * no account, since buying asks none — or null for none.
   */
  viewer: "session" | { offer: CustomerFirstPurchaseOffer | null }
  /** What this browser's `bl_popup` says was closed. */
  seen: PopupSeen | null
}

export interface OffersView {
  /** Which of the pop-up's two notices this page mounts as a dialog; null for none. */
  notice: PopupNotice | null
  /** Which notice the offer strip is, if there is one to draw for this viewer; null and no strip is drawn. */
  strip: PopupNotice | null
  /** The revision closing either is remembered at (`closingRevisionOf`). */
  revision: number
}

/**
 * What a page shows of the shop's offers, between its pop-up and the strip under the header
 * (BEELINK-310) — decided on the server, from the cookies of the request, so the HTML never holds
 * a strip that a dialog is about to say over, nor one this browser already closed (BEELINK-311).
 *
 * - **The pop-up switched off:** no dialog; the strip is the notice, until it is closed. Anything
 *   this browser closed of that notice at the shop — the strip, or a dialog from when the pop-up
 *   was on — keeps it out: closed is closed, for the cookie's thirty days.
 * - **A dialog still due** — to whoever has a first-order benefit to be told, signed in or not:
 *   the coupon, or the promotion — and not yet closed by this browser: the dialog, and no strip. While it waits (its delay, the cookie question, its trigger) nothing says the same
 *   thing under the header.
 * - **No dialog due** — closed already, or nobody it speaks to: nothing, unless the shopkeeper
 *   keeps the strip as a reminder. Kept, it is there from the page after the one where the dialog
 *   was closed — never under the pointer at the click — and until it is closed itself.
 *
 * Nobody with nothing to be told is called to anything: no notice invites anyone to open an
 * account — buying asks none. Nor is a browser holding a session, whoever it reads as on this page.
 * Every notice is the first-order one (`CUSTOMER`); `VISITOR` is only what an older cookie may hold.
 */
export function offersViewOf({ popup, viewer, seen }: OffersViewAsk): OffersView {
  const stripFor: PopupNotice = "CUSTOMER"
  const revision = closingRevisionOf(seen, popup?.revision ?? 0)

  if (!popup) return { notice: null, strip: noticeClosed(seen, stripFor, "DIALOG", 0) ? null : stripFor, revision }

  const speaksTo: PopupNotice | null = viewer !== "session" && viewer.offer ? "CUSTOMER" : null
  const notice = speaksTo && !noticeClosed(seen, speaksTo, "DIALOG", popup.revision) ? speaksTo : null
  const reminder = notice === null && popup.keepReminder && !noticeClosed(seen, stripFor, "STRIP", popup.revision)

  return { notice, strip: reminder ? stripFor : null, revision }
}
