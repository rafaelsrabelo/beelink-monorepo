import "server-only"

// Next
import { cookies } from "next/headers"

// App
import { CUSTOMER_ACCESS_COOKIE, CUSTOMER_REFRESH_COOKIE } from "./customer-session-cookies"
import { POPUP_COOKIE, decodePopupSeen } from "./popup-cookie"

/** What a request says of this browser and the shop's pop-up (BEELINK-306). */
export interface PopupVisitor {
  /** The revision this browser closed at this shop; null for none. */
  seen: number | null
  /**
   * Whether the browser holds anything of a shopper's session at this shop. A token that ran out
   * reads as a visitor to `shopperAt` until the proxy renews it — and a customer must never be
   * called to open the account they already have, not even on that one page.
   */
  holdsSession: boolean
}

/**
 * Read per request, like the cart, and never part of a kept answer: no public read is keyed by it.
 * The cookies are scoped to `/<slug>`, so the browser only sends this shop's.
 */
export async function popupVisitorAt(): Promise<PopupVisitor> {
  const jar = await cookies()
  return { seen: decodePopupSeen(jar.get(POPUP_COOKIE)?.value), holdsSession: jar.has(CUSTOMER_ACCESS_COOKIE) || jar.has(CUSTOMER_REFRESH_COOKIE) }
}
