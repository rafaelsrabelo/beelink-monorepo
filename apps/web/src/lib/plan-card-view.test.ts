// Libs
import { describe, expect, it } from "vitest"

// Types
import type { StoreSubscription, StoreSubscriptionAnswer } from "@harness-monorepo/contracts"

// App
import { planCardOf } from "./plan-card-view"

/** 15/10/2026, at noon in Brasília. */
const NOW = new Date("2026-10-15T15:00:00.000Z")

/** A page in trial whose last day is 22/10/2026, with nothing paid, chosen or given. */
function trialing(overrides: Partial<StoreSubscription> = {}): StoreSubscription {
  return {
    id: "sub",
    status: "TRIALING",
    trialStartedAt: "2026-10-15T15:00:00.000Z",
    trialEndsAt: "2026-10-23T03:00:00.000Z",
    trialLastDay: "2026-10-22",
    trialDaysLeft: 7,
    plan: null,
    cycle: null,
    priceCents: null,
    currentPeriodEndsAt: null,
    cancelRequestedAt: null,
    freePeriodEndsAt: null,
    freePeriodLastDay: null,
    freePeriodDaysLeft: null,
    couponRedeemedAt: null,
    paymentMethod: null,
    invoiceUrl: null,
    card: null,
    graceEndsAt: null,
    lock: null,
    ...overrides,
  }
}

const on = (subscription: StoreSubscription | null): StoreSubscriptionAnswer => ({ billingEnforced: true, subscription })
const off = (subscription: StoreSubscription | null): StoreSubscriptionAnswer => ({ billingEnforced: false, subscription })
const card = (subscription: StoreSubscription) => planCardOf(on(subscription), NOW, "pt-BR")

const BEELINK = { id: "plan", slug: "beelink", name: "Beelink" }
/** A page that paid monthly, its period running until the end of 12/11/2026. */
const paid = trialing({ status: "ACTIVE", trialDaysLeft: 0, plan: BEELINK, cycle: "MONTHLY", priceCents: 5990, currentPeriodEndsAt: "2026-11-13T03:00:00.000Z", paymentMethod: "PIX" })
/** A page that paid until 12/10 and did not renew: past due, its grace ending as 19/10 closes. */
const pastDue = { ...paid, status: "PAST_DUE" as const, currentPeriodEndsAt: "2026-10-13T03:00:00.000Z", graceEndsAt: "2026-10-20T03:00:00.000Z" }
/** A page with a free time until 13/11/2026 — a coupon's month, or the one the pages of 13/10 were given. */
const free = (daysLeft: number, overrides: Partial<StoreSubscription> = {}) => trialing({ freePeriodEndsAt: "2026-11-14T03:00:00.000Z", freePeriodLastDay: "2026-11-13", freePeriodDaysLeft: daysLeft, ...overrides })

describe("the plan's card (BEELINK-220) — where there is none", () => {
  it("is none with billing off, whatever the row says: the menu stays as it was", () => {
    expect(planCardOf(off(trialing({ status: "TRIAL_EXPIRED", trialDaysLeft: 0, lock: "TRIAL_EXPIRED" })), NOW, "pt-BR")).toBeNull()
    expect(planCardOf(off(trialing({ trialDaysLeft: 0 })), NOW, "pt-BR")).toBeNull()
    expect(planCardOf(off(paid), NOW, "pt-BR")).toBeNull()
  })

  it("is none for a page owing nothing, and for one with no subscription", () => {
    expect(card(trialing({ status: "EXEMPT", trialDaysLeft: 0 }))).toBeNull()
    expect(planCardOf(on(null), NOW, "pt-BR")).toBeNull()
  })
})

describe("the plan's card (BEELINK-220) — where the page stands", () => {
  it("counts a trial's days as the API does, and warns of its last two and its last", () => {
    expect(card(trialing())).toEqual({ standing: { status: "TRIALING", daysLeft: 7 }, plan: null, warning: null })
    expect(card(trialing({ trialDaysLeft: 3 }))?.warning).toBeNull()
    for (const daysLeft of [2, 1, 0]) {
      expect(card(trialing({ trialDaysLeft: daysLeft }))).toEqual({ standing: { status: "TRIALING", daysLeft }, plan: null, warning: "strip" })
    }
  })

  it("tells a free time before the status, by its last day, with last days of its own", () => {
    expect(card(free(29))).toEqual({ standing: { status: "FREE", lastDay: "13/11/2026", daysLeft: 29 }, plan: null, warning: null })
    expect(card(free(2))?.warning).toBe("strip")
    // A coupon used in the trial: the trial's last days do not warn a page that does not lock with it.
    expect(card(free(29, { trialDaysLeft: 0 }))?.warning).toBeNull()
  })

  it("tells a page of 13/10 past its trial and inside its free month as free, never as locked", () => {
    expect(card(free(29, { status: "TRIAL_EXPIRED", trialDaysLeft: 0 }))).toEqual({ standing: { status: "FREE", lastDay: "13/11/2026", daysLeft: 29 }, plan: null, warning: null })
  })

  it("says a locked page is locked, whatever the reason, and always warns of it", () => {
    const locked = { standing: { status: "LOCKED" }, plan: null, warning: "lock" }
    expect(card(trialing({ status: "TRIAL_EXPIRED", trialDaysLeft: 0, lock: "TRIAL_EXPIRED" }))).toEqual(locked)
    expect(card(free(0, { status: "TRIAL_EXPIRED", trialDaysLeft: 0, freePeriodDaysLeft: null, lock: "TRIAL_EXPIRED" }))).toEqual(locked)
    expect(card({ ...pastDue, status: "SUSPENDED", lock: "SUSPENDED" })).toEqual({ ...locked, plan: "Beelink" })
    expect(card({ ...pastDue, status: "CANCELED", graceEndsAt: null, lock: "CANCELED" })).toEqual({ ...locked, plan: "Beelink" })
  })

  it("tells a paid page the day it renews — its last day paid for — and the plan it chose", () => {
    expect(card(paid)).toEqual({ standing: { status: "ACTIVE", renewsOn: "12/11/2026" }, plan: "Beelink", warning: null })
    expect(card({ ...paid, currentPeriodEndsAt: null })?.standing).toEqual({ status: "ACTIVE", renewsOn: null })
  })

  it("says a renewal unpaid is overdue, and warns of it through the grace", () => {
    expect(card(pastDue)).toEqual({ standing: { status: "PAST_DUE" }, plan: "Beelink", warning: "strip" })
  })

  it("tells a cancelled page until when it is used, and warns of nothing", () => {
    const cancelled = { ...paid, status: "CANCELED" as const }
    expect(card(cancelled)).toEqual({ standing: { status: "CANCELED", until: "12/11/2026" }, plan: "Beelink", warning: null })
  })

  // Billing on and no Asaas key of bee-link's: the API locks nothing and says no lock. The card tells
  // the standing, and its warning waits on the account's read, which says it cannot lock.
  it("tells what stands where nothing locks, warning of nothing that cannot come", () => {
    expect(card(trialing({ status: "TRIAL_EXPIRED", trialDaysLeft: 0 }))).toEqual({ standing: { status: "TRIAL_EXPIRED" }, plan: null, warning: null })
    expect(card({ ...pastDue, status: "SUSPENDED" })).toEqual({ standing: { status: "PAST_DUE" }, plan: "Beelink", warning: null })
    expect(card({ ...pastDue, status: "CANCELED", graceEndsAt: null })).toEqual({ standing: { status: "CANCELED", until: null }, plan: "Beelink", warning: null })
  })
})
