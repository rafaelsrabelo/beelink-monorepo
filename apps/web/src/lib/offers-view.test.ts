// Libs
import { describe, expect, it } from "vitest"

// Types
import type { CustomerFirstPurchaseOffer } from "@harness-monorepo/contracts"

// App
import { offersViewOf, type OffersViewAsk } from "./offers-view"
import { decodePopupSeen, type NoticeSurface, type PopupNotice, type PopupSeen } from "./popup-cookie"

const ON = { revision: 3, keepReminder: true }
const NO_REMINDER = { revision: 3, keepReminder: false }
const offer: CustomerFirstPurchaseOffer = { source: "COUPON", code: "PRIMEIRA10", kind: "PERCENT", percentBps: 1000, amountCents: null, minSubtotalCents: 0, endsAt: null }
const closed = (notice: PopupNotice, surface: NoticeSurface, revision = 3): PopupSeen => ({ notice, surface, revision })
/** What a browser kept from before: the invitation to open an account, which no page says any more. */
const oldInvitationClosed = closed("VISITOR", "DIALOG")
const couponClosed = closed("CUSTOMER", "DIALOG")
const couponStripClosed = closed("CUSTOMER", "STRIP")
const anyone = { offer }
const VIEWERS: OffersViewAsk["viewer"][] = ["session", anyone, { offer: null }]
const SEEN: OffersViewAsk["seen"][] = [null, oldInvitationClosed, closed("VISITOR", "STRIP"), couponClosed, couponStripClosed, closed("CUSTOMER", "DIALOG", 99), closed("CUSTOMER", "STRIP", 0)]

/** BEELINK-310: the dialog first. BEELINK-311: what was closed stays closed — decided from the request's cookies. */
describe("offersViewOf — the first-order notice, to anyone with no order", () => {
  describe("with the pop-up off", () => {
    it("mounts no dialog, for anyone, whatever the cookie says", () => {
      for (const viewer of VIEWERS) for (const seen of SEEN) expect(offersViewOf({ popup: null, viewer, seen }).notice).toBeNull()
    })

    it("draws the first-order strip for a browser that closed nothing — signed in or not", () => {
      expect(offersViewOf({ popup: null, viewer: anyone, seen: null })).toEqual({ notice: null, strip: "CUSTOMER", revision: 0 })
    })

    // BEELINK-311, the owner's words: "ele era pra aparecer só uma vez e o cliente fecha, salva no browser isso".
    it("draws no strip once it was closed", () => {
      expect(offersViewOf({ popup: null, viewer: anyone, seen: decodePopupSeen("3000000000") }).strip).toBeNull()
    })

    // The code is news to whoever only ever saw the invitation to open an account.
    it("tells the coupon once to a browser that closed the old invitation", () => {
      expect(offersViewOf({ popup: null, viewer: anyone, seen: decodePopupSeen("2000000000") }).strip).toBe("CUSTOMER")
    })

    it("counts a dialog closed while the shop's pop-up was on: a notice closed stays closed", () => {
      expect(offersViewOf({ popup: null, viewer: anyone, seen: decodePopupSeen("1000000001") }).strip).toBeNull()
    })

    it("remembers a closing at revision 0, or at the one the cookie already holds — never one before it", () => {
      expect(offersViewOf({ popup: null, viewer: anyone, seen: null }).revision).toBe(0)
      expect(offersViewOf({ popup: null, viewer: anyone, seen: decodePopupSeen("5") }).revision).toBe(5)
    })
  })

  describe("with the pop-up on", () => {
    it("gives whoever has a first-order benefit its notice, and no strip under it", () => {
      expect(offersViewOf({ popup: ON, viewer: anyone, seen: null })).toEqual({ notice: "CUSTOMER", strip: null, revision: 3 })
    })

    it("still gives it after the old invitation was closed", () => {
      expect(offersViewOf({ popup: ON, viewer: anyone, seen: oldInvitationClosed })).toEqual({ notice: "CUSTOMER", strip: null, revision: 3 })
    })

    it("gives nothing to whoever has nothing to be told — no notice invites anyone to open an account", () => {
      expect(offersViewOf({ popup: ON, viewer: { offer: null }, seen: null }).notice).toBeNull()
    })

    it("gives a browser holding a session it could not read no notice", () => {
      expect(offersViewOf({ popup: ON, viewer: "session", seen: null }).notice).toBeNull()
    })

    it("opens the dialog once for a browser that only closed the strip while the pop-up was off", () => {
      expect(offersViewOf({ popup: ON, viewer: anyone, seen: closed("CUSTOMER", "STRIP", 0) }).notice).toBe("CUSTOMER")
    })

    it("shows the notice again, with no strip, when the shopkeeper changes the pop-up — whatever was closed before", () => {
      for (const seen of [couponClosed, couponStripClosed]) expect(offersViewOf({ popup: { ...ON, revision: 4 }, viewer: anyone, seen })).toEqual({ notice: "CUSTOMER", strip: null, revision: 4 })
    })

    it("never has both on one page", () => {
      for (const popup of [ON, NO_REMINDER]) for (const viewer of VIEWERS) for (const seen of SEEN) {
        const view = offersViewOf({ popup, viewer, seen })
        expect(view.notice !== null && view.strip !== null).toBe(false)
      }
    })
  })

  describe("with the pop-up on and the reminder kept", () => {
    it("once the dialog was closed, draws the strip as the reminder", () => {
      expect(offersViewOf({ popup: ON, viewer: anyone, seen: couponClosed })).toEqual({ notice: null, strip: "CUSTOMER", revision: 3 })
    })

    // BEELINK-311: the reminder closes for good too.
    it("draws nothing once the strip itself was closed", () => {
      expect(offersViewOf({ popup: ON, viewer: anyone, seen: couponStripClosed })).toEqual({ notice: null, strip: null, revision: 3 })
    })
  })

  // The default since BEELINK-311: after the dialog, nothing on the shop's pages.
  describe("with the pop-up on and the reminder off", () => {
    it("never draws the strip, for anyone, before or after the notice", () => {
      for (const viewer of VIEWERS) for (const seen of SEEN) expect(offersViewOf({ popup: NO_REMINDER, viewer, seen }).strip).toBeNull()
    })

    it("mounts the notices exactly as with the reminder on", () => {
      for (const viewer of VIEWERS) for (const seen of SEEN) expect(offersViewOf({ popup: NO_REMINDER, viewer, seen }).notice).toBe(offersViewOf({ popup: ON, viewer, seen }).notice)
    })
  })
})
