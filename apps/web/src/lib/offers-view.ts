// Types
import type { CustomerFirstPurchaseOffer, StorefrontPopup } from "@harness-monorepo/contracts"

// App
import { popupSeen, type PopupNotice, type PopupSeen } from "./popup-cookie"

export interface OffersViewAsk {
  /** The shop's pop-up while it is switched on; null otherwise. */
  popup: Pick<StorefrontPopup, "revision" | "keepReminder"> | null
  /**
   * Who the page is drawn for: a visitor with no account; a browser holding a shopper's session the
   * page could not read as one (a token that ran out — BEELINK-306); or a signed-in shopper, with
   * the first-order benefit the strip would tell them (`firstOrderOfferOf`) or null for none.
   */
  viewer: "visitor" | "session" | { offer: CustomerFirstPurchaseOffer | null }
  /** What this browser's `bl_popup` says was closed. */
  seen: PopupSeen | null
}

export interface OffersView {
  /** Which of the pop-up's two notices this page mounts; null for none. */
  notice: PopupNotice | null
  /** Whether the offer strip is drawn, if there is one to draw for this viewer. */
  strip: boolean
}

/**
 * What a page shows of the shop's offers, between its pop-up and the strip under the header
 * (BEELINK-310) — decided on the server, from the cookies of the request, so the HTML never holds
 * a strip that a dialog is about to say over.
 *
 * - **The pop-up switched off:** no notice, and the strip exactly as it always was. A shop that
 *   never touched its pop-up sees no change at all.
 * - **A notice still due** — to a visitor, the invitation; to a signed-in shopper with a
 *   first-order benefit to tell, their coupon — and not yet closed by this browser: the notice, and
 *   no strip. The dialog comes first, and while it waits (its delay, the cookie question, its
 *   trigger) nothing says the same thing under the header.
 * - **No notice due** — closed already, or nobody it speaks to: the strip, if the shopkeeper keeps
 *   it as the reminder; nothing at all if not. The strip is therefore there from the page after the
 *   one where the dialog was closed, and never arrives under the pointer at the click.
 *
 * A shopper with nothing to be told is called to nothing: the invitation is for somebody with no
 * account. Nor is a browser holding a session, whoever it reads as on this one page.
 */
export function offersViewOf({ popup, viewer, seen }: OffersViewAsk): OffersView {
  if (!popup) return { notice: null, strip: true }

  const speaksTo: PopupNotice | null = viewer === "visitor" ? "VISITOR" : viewer !== "session" && viewer.offer ? "CUSTOMER" : null
  const notice = speaksTo && !popupSeen(seen, speaksTo, popup.revision) ? speaksTo : null

  return { notice, strip: notice === null && popup.keepReminder }
}
