// Libs
import { describe, expect, it } from "vitest"

// Types
import type { StoreSubscription, StoreSubscriptionAnswer } from "@harness-monorepo/contracts"

// App
import { isSubscribePage, pageLockOf, pageSlugOf, pageStripOf } from "./page-lock-view"

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

/** A page that paid monthly until 12/10 and did not renew: past due, its grace ending as 19/10 closes. */
const pastDue = trialing({ status: "PAST_DUE", trialDaysLeft: 0, cycle: "MONTHLY", priceCents: 5990, currentPeriodEndsAt: "2026-10-13T03:00:00.000Z", graceEndsAt: "2026-10-20T03:00:00.000Z" })

describe("which page a panel address is of (BEELINK-296)", () => {
  it("is the segment after /admin, and none on the panel's other pages", () => {
    expect(pageSlugOf("/admin/loja-amora")).toBe("loja-amora")
    expect(pageSlugOf("/admin/loja-amora/orders/12")).toBe("loja-amora")
    expect(pageSlugOf("/dashboard")).toBeNull()
    expect(pageSlugOf("/create-store")).toBeNull()
  })

  it("tells the Assinar screen apart from every other screen of the page", () => {
    expect(isSubscribePage("/admin/loja-amora/subscribe", "loja-amora")).toBe(true)
    expect(isSubscribePage("/admin/loja-amora", "loja-amora")).toBe(false)
    expect(isSubscribePage("/admin/loja-amora/subscriber", "loja-amora")).toBe(false)
    expect(isSubscribePage("/admin/outra/subscribe", "loja-amora")).toBe(false)
  })
})

describe("a locked page's notice (BEELINK-296)", () => {
  it("is none where billing is off, whatever the row says, and none for a page with no subscription or an open one", () => {
    expect(pageLockOf(off(trialing({ status: "TRIAL_EXPIRED", lock: "TRIAL_EXPIRED" })), "pt-BR")).toBeNull()
    expect(pageLockOf(on(null), "pt-BR")).toBeNull()
    expect(pageLockOf(on(trialing()), "pt-BR")).toBeNull()
    expect(pageLockOf(undefined, "pt-BR")).toBeNull()
  })

  it("tells a trial that ended by its last day", () => {
    expect(pageLockOf(on(trialing({ status: "TRIAL_EXPIRED", trialDaysLeft: 0, lock: "TRIAL_EXPIRED" })), "pt-BR")).toEqual({ reason: "TRIAL_EXPIRED", endedOn: "22/10/2026" })
  })

  it("tells a free month that ran out as the free month, by its last day, though the API locks it as the trial", () => {
    const freeOver = trialing({ status: "TRIAL_EXPIRED", trialDaysLeft: 0, freePeriodEndsAt: "2026-11-14T03:00:00.000Z", freePeriodLastDay: "2026-11-13", lock: "TRIAL_EXPIRED" })
    expect(pageLockOf(on(freeOver), "pt-BR")).toEqual({ reason: "FREE_PERIOD_OVER", endedOn: "13/11/2026" })
  })

  it("tells a suspended page the grace's last day — the day before its end — and a cancelled one the paid period's", () => {
    expect(pageLockOf(on({ ...pastDue, status: "SUSPENDED", lock: "SUSPENDED" }), "pt-BR")).toEqual({ reason: "SUSPENDED", endedOn: "19/10/2026" })
    expect(pageLockOf(on({ ...pastDue, status: "CANCELED", graceEndsAt: null, lock: "CANCELED" }), "pt-BR")).toEqual({ reason: "CANCELED", endedOn: "12/10/2026" })
  })

  it("says no day where there is none: a page cancelled with no period, or one suspended with no grace", () => {
    expect(pageLockOf(on({ ...pastDue, status: "CANCELED", currentPeriodEndsAt: null, graceEndsAt: null, lock: "CANCELED" }), "pt-BR")).toEqual({ reason: "CANCELED", endedOn: null })
    expect(pageLockOf(on({ ...pastDue, status: "SUSPENDED", graceEndsAt: null, lock: "SUSPENDED" }), "pt-BR")).toEqual({ reason: "SUSPENDED", endedOn: null })
  })

  it("writes the day as the reader's language does", () => {
    expect(pageLockOf(on(trialing({ status: "TRIAL_EXPIRED", trialDaysLeft: 0, lock: "TRIAL_EXPIRED" })), "en")).toEqual({ reason: "TRIAL_EXPIRED", endedOn: "10/22/2026" })
  })
})

describe("the strip before a page locks (BEELINK-296)", () => {
  it("is none where billing is off, whatever the days say", () => {
    expect(pageStripOf(off(trialing({ trialDaysLeft: 0 })), "pt-BR")).toBeNull()
    expect(pageStripOf(off(pastDue), "pt-BR")).toBeNull()
    expect(pageStripOf(on(null), "pt-BR")).toBeNull()
  })

  it("tells the trial's last days — two, one and the last — and nothing before them", () => {
    expect(pageStripOf(on(trialing({ trialDaysLeft: 3 })), "pt-BR")).toBeNull()
    expect(pageStripOf(on(trialing({ trialDaysLeft: 2 })), "pt-BR")).toEqual({ kind: "trial", daysLeft: 2, lastDay: "22/10/2026" })
    expect(pageStripOf(on(trialing({ trialDaysLeft: 1 })), "pt-BR")).toEqual({ kind: "trial", daysLeft: 1, lastDay: "22/10/2026" })
    expect(pageStripOf(on(trialing({ trialDaysLeft: 0 })), "pt-BR")).toEqual({ kind: "trial", daysLeft: 0, lastDay: "22/10/2026" })
  })

  it("looks at a free time before the trial: a page that used a coupon in its trial is not told the trial ends", () => {
    const couponInTrial = { freePeriodEndsAt: "2026-11-23T03:00:00.000Z", freePeriodLastDay: "2026-11-22", couponRedeemedAt: "2026-10-20T12:00:00.000Z" }
    expect(pageStripOf(on(trialing({ trialDaysLeft: 1, freePeriodDaysLeft: 32, ...couponInTrial })), "pt-BR")).toBeNull()
    expect(pageStripOf(on(trialing({ status: "TRIAL_EXPIRED", trialDaysLeft: 0, freePeriodDaysLeft: 2, ...couponInTrial })), "pt-BR")).toEqual({ kind: "free", daysLeft: 2, lastDay: "22/11/2026" })
    expect(pageStripOf(on(trialing({ status: "TRIAL_EXPIRED", trialDaysLeft: 0, freePeriodDaysLeft: 0, ...couponInTrial })), "pt-BR")).toEqual({ kind: "free", daysLeft: 0, lastDay: "22/11/2026" })
  })

  it("tells a page past due inside its grace the last day to pay", () => {
    expect(pageStripOf(on(pastDue), "pt-BR")).toEqual({ kind: "grace", payBy: "19/10/2026" })
  })

  it("is none for a locked page, which has its notice, and for a page paid, exempt or cancelled with time left", () => {
    expect(pageStripOf(on({ ...pastDue, status: "SUSPENDED", lock: "SUSPENDED" }), "pt-BR")).toBeNull()
    expect(pageStripOf(on(trialing({ status: "TRIAL_EXPIRED", trialDaysLeft: 0, lock: "TRIAL_EXPIRED" })), "pt-BR")).toBeNull()
    expect(pageStripOf(on({ ...pastDue, status: "ACTIVE", graceEndsAt: null, currentPeriodEndsAt: "2026-11-13T03:00:00.000Z" }), "pt-BR")).toBeNull()
    expect(pageStripOf(on(trialing({ status: "EXEMPT", trialDaysLeft: 0 })), "pt-BR")).toBeNull()
    expect(pageStripOf(on({ ...pastDue, status: "CANCELED", graceEndsAt: null, currentPeriodEndsAt: "2026-11-13T03:00:00.000Z" }), "pt-BR")).toBeNull()
  })

  it("is none for a page whose trial ended where nothing locks — billing on with no Asaas key of bee-link's", () => {
    expect(pageStripOf(on(trialing({ status: "TRIAL_EXPIRED", trialDaysLeft: 0 })), "pt-BR")).toBeNull()
  })
})
