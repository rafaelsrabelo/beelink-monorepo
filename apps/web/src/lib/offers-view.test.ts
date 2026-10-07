// Libs
import { describe, expect, it } from "vitest"

// Types
import type { CustomerFirstPurchaseOffer } from "@harness-monorepo/contracts"

// App
import { offersViewOf, type OffersViewAsk } from "./offers-view"

const ON = { revision: 3, keepReminder: true }
const NO_REMINDER = { revision: 3, keepReminder: false }
const offer: CustomerFirstPurchaseOffer = { source: "COUPON", code: "PRIMEIRA10", kind: "PERCENT", percentBps: 1000, amountCents: null, minSubtotalCents: 0, endsAt: null }
const invitationClosed = { notice: "VISITOR", revision: 3 } as const
const couponClosed = { notice: "CUSTOMER", revision: 3 } as const
const VIEWERS: OffersViewAsk["viewer"][] = ["visitor", "session", { offer }, { offer: null }]
const SEEN: OffersViewAsk["seen"][] = [null, invitationClosed, couponClosed, { notice: "CUSTOMER", revision: 99 }]

/** BEELINK-310: the dialog first, the strip as its reminder — decided from the request's cookies. */
describe("offersViewOf", () => {
  // The pin: a shop that never touched its pop-up sees no change at all.
  it("with the pop-up off, mounts no notice and draws the strip — for every viewer, whatever the cookie says", () => {
    for (const viewer of VIEWERS) for (const seen of SEEN) expect(offersViewOf({ popup: null, viewer, seen })).toEqual({ notice: null, strip: true })
  })

  describe("with the pop-up on", () => {
    it("gives a visitor the invitation, and no strip under it", () => {
      expect(offersViewOf({ popup: ON, viewer: "visitor", seen: null })).toEqual({ notice: "VISITOR", strip: false })
    })

    it("gives a shopper with a first-order benefit their coupon's notice, and no strip under it", () => {
      expect(offersViewOf({ popup: ON, viewer: { offer }, seen: null })).toEqual({ notice: "CUSTOMER", strip: false })
    })

    it("still gives that shopper their notice after they closed the invitation as a visitor", () => {
      expect(offersViewOf({ popup: ON, viewer: { offer }, seen: invitationClosed })).toEqual({ notice: "CUSTOMER", strip: false })
    })

    it("gives a shopper with nothing to be told no notice: the invitation is not for somebody with an account", () => {
      expect(offersViewOf({ popup: ON, viewer: { offer: null }, seen: null }).notice).toBeNull()
    })

    it("gives a browser holding a session it could not read no notice", () => {
      expect(offersViewOf({ popup: ON, viewer: "session", seen: null }).notice).toBeNull()
    })

    it("once the notice was closed, draws the strip as the reminder", () => {
      expect(offersViewOf({ popup: ON, viewer: "visitor", seen: invitationClosed })).toEqual({ notice: null, strip: true })
      expect(offersViewOf({ popup: ON, viewer: { offer }, seen: couponClosed })).toEqual({ notice: null, strip: true })
      // Signed out again after reading their code: not invited, reminded.
      expect(offersViewOf({ popup: ON, viewer: "visitor", seen: couponClosed })).toEqual({ notice: null, strip: true })
    })

    it("draws the strip for whoever the pop-up does not speak to", () => {
      expect(offersViewOf({ popup: ON, viewer: "session", seen: null }).strip).toBe(true)
      expect(offersViewOf({ popup: ON, viewer: { offer: null }, seen: null }).strip).toBe(true)
    })

    it("shows the notice again, and takes the strip back, when the shopkeeper changes the pop-up", () => {
      expect(offersViewOf({ popup: { ...ON, revision: 4 }, viewer: "visitor", seen: invitationClosed })).toEqual({ notice: "VISITOR", strip: false })
      expect(offersViewOf({ popup: { ...ON, revision: 4 }, viewer: { offer }, seen: couponClosed })).toEqual({ notice: "CUSTOMER", strip: false })
    })

    it("never has both on one page", () => {
      for (const popup of [ON, NO_REMINDER]) for (const viewer of VIEWERS) for (const seen of SEEN) {
        const view = offersViewOf({ popup, viewer, seen })
        expect(view.notice !== null && view.strip).toBe(false)
      }
    })
  })

  describe("with the pop-up on and the reminder off", () => {
    it("never draws the strip, for anyone, before or after the notice", () => {
      for (const viewer of VIEWERS) for (const seen of SEEN) expect(offersViewOf({ popup: NO_REMINDER, viewer, seen }).strip).toBe(false)
    })

    it("mounts the notices exactly as with the reminder on", () => {
      for (const viewer of VIEWERS) for (const seen of SEEN) expect(offersViewOf({ popup: NO_REMINDER, viewer, seen }).notice).toBe(offersViewOf({ popup: ON, viewer, seen }).notice)
    })
  })
})
