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
const invitationClosed = closed("VISITOR", "DIALOG")
const invitationStripClosed = closed("VISITOR", "STRIP")
const couponClosed = closed("CUSTOMER", "DIALOG")
const couponStripClosed = closed("CUSTOMER", "STRIP")
const VIEWERS: OffersViewAsk["viewer"][] = ["visitor", "session", { offer }, { offer: null }]
const SEEN: OffersViewAsk["seen"][] = [null, invitationClosed, invitationStripClosed, couponClosed, couponStripClosed, closed("CUSTOMER", "DIALOG", 99), closed("VISITOR", "STRIP", 0), closed("CUSTOMER", "STRIP", 0)]
const customer = { offer }

/** BEELINK-310: the dialog first. BEELINK-311: what was closed stays closed — decided from the request's cookies. */
describe("offersViewOf", () => {
  describe("with the pop-up off", () => {
    it("mounts no dialog, for anyone, whatever the cookie says", () => {
      for (const viewer of VIEWERS) for (const seen of SEEN) expect(offersViewOf({ popup: null, viewer, seen }).notice).toBeNull()
    })

    it("draws the strip for a browser that closed nothing — the invitation for a visitor, their own offer for a shopper", () => {
      expect(offersViewOf({ popup: null, viewer: "visitor", seen: null })).toEqual({ notice: null, strip: "VISITOR", revision: 0 })
      expect(offersViewOf({ popup: null, viewer: "session", seen: null })).toEqual({ notice: null, strip: "VISITOR", revision: 0 })
      expect(offersViewOf({ popup: null, viewer: customer, seen: null })).toEqual({ notice: null, strip: "CUSTOMER", revision: 0 })
    })

    // BEELINK-311, the owner's words: "ele era pra aparecer só uma vez e o cliente fecha, salva no browser isso".
    it("draws no strip once it was closed: a visitor's stays closed, and so does a customer's", () => {
      expect(offersViewOf({ popup: null, viewer: "visitor", seen: decodePopupSeen("2000000000") }).strip).toBeNull()
      expect(offersViewOf({ popup: null, viewer: customer, seen: decodePopupSeen("3000000000") }).strip).toBeNull()
      // Signed out again after closing their coupon's strip: not invited either.
      expect(offersViewOf({ popup: null, viewer: "visitor", seen: decodePopupSeen("3000000000") }).strip).toBeNull()
    })

    it("still tells a customer who never ordered their coupon once, after they closed the invitation as a visitor", () => {
      expect(offersViewOf({ popup: null, viewer: customer, seen: decodePopupSeen("2000000000") }).strip).toBe("CUSTOMER")
    })

    it("counts a dialog closed while the shop's pop-up was on: a notice closed stays closed", () => {
      expect(offersViewOf({ popup: null, viewer: "visitor", seen: decodePopupSeen("1") }).strip).toBeNull()
      expect(offersViewOf({ popup: null, viewer: customer, seen: decodePopupSeen("1") }).strip).toBe("CUSTOMER")
      expect(offersViewOf({ popup: null, viewer: customer, seen: decodePopupSeen("1000000001") }).strip).toBeNull()
    })

    it("remembers a closing at revision 0, or at the one the cookie already holds — never one before it", () => {
      expect(offersViewOf({ popup: null, viewer: "visitor", seen: null }).revision).toBe(0)
      expect(offersViewOf({ popup: null, viewer: customer, seen: decodePopupSeen("5") }).revision).toBe(5)
    })
  })

  describe("with the pop-up on", () => {
    it("gives a visitor the invitation, and no strip under it", () => {
      expect(offersViewOf({ popup: ON, viewer: "visitor", seen: null })).toEqual({ notice: "VISITOR", strip: null, revision: 3 })
    })

    it("gives a shopper with a first-order benefit their coupon's notice, and no strip under it", () => {
      expect(offersViewOf({ popup: ON, viewer: customer, seen: null })).toEqual({ notice: "CUSTOMER", strip: null, revision: 3 })
    })

    it("still gives that shopper their notice after they closed the invitation as a visitor — its dialog, or its strip", () => {
      expect(offersViewOf({ popup: ON, viewer: customer, seen: invitationClosed })).toEqual({ notice: "CUSTOMER", strip: null, revision: 3 })
      expect(offersViewOf({ popup: ON, viewer: customer, seen: invitationStripClosed })).toEqual({ notice: "CUSTOMER", strip: null, revision: 3 })
    })

    it("gives a shopper with nothing to be told no notice: the invitation is not for somebody with an account", () => {
      expect(offersViewOf({ popup: ON, viewer: { offer: null }, seen: null }).notice).toBeNull()
    })

    it("gives a browser holding a session it could not read no notice", () => {
      expect(offersViewOf({ popup: ON, viewer: "session", seen: null }).notice).toBeNull()
    })

    it("opens the dialog once for a browser that only closed the strip while the pop-up was off", () => {
      expect(offersViewOf({ popup: ON, viewer: "visitor", seen: closed("VISITOR", "STRIP", 0) }).notice).toBe("VISITOR")
      expect(offersViewOf({ popup: ON, viewer: customer, seen: closed("CUSTOMER", "STRIP", 0) }).notice).toBe("CUSTOMER")
    })

    it("shows the notice again, with no strip, when the shopkeeper changes the pop-up — whatever was closed before", () => {
      for (const seen of [invitationClosed, invitationStripClosed]) expect(offersViewOf({ popup: { ...ON, revision: 4 }, viewer: "visitor", seen })).toEqual({ notice: "VISITOR", strip: null, revision: 4 })
      for (const seen of [couponClosed, couponStripClosed]) expect(offersViewOf({ popup: { ...ON, revision: 4 }, viewer: customer, seen })).toEqual({ notice: "CUSTOMER", strip: null, revision: 4 })
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
      expect(offersViewOf({ popup: ON, viewer: "visitor", seen: invitationClosed })).toEqual({ notice: null, strip: "VISITOR", revision: 3 })
      expect(offersViewOf({ popup: ON, viewer: customer, seen: couponClosed })).toEqual({ notice: null, strip: "CUSTOMER", revision: 3 })
    })

    // BEELINK-311: the reminder closes for good too.
    it("draws nothing once the strip itself was closed", () => {
      expect(offersViewOf({ popup: ON, viewer: "visitor", seen: invitationStripClosed })).toEqual({ notice: null, strip: null, revision: 3 })
      expect(offersViewOf({ popup: ON, viewer: customer, seen: couponStripClosed })).toEqual({ notice: null, strip: null, revision: 3 })
    })

    it("does not invite whoever closed their coupon's notice and signed out", () => {
      expect(offersViewOf({ popup: ON, viewer: "visitor", seen: couponClosed })).toEqual({ notice: null, strip: null, revision: 3 })
    })

    it("draws the strip for a browser holding a session the page could not read, until it is closed", () => {
      expect(offersViewOf({ popup: ON, viewer: "session", seen: null }).strip).toBe("VISITOR")
      expect(offersViewOf({ popup: ON, viewer: "session", seen: invitationStripClosed }).strip).toBeNull()
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
