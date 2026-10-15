// Libs
import { describe, expect, it } from "vitest"

// Types
import type { PlanCatalog, StoreSubscription, StoreSubscriptionAnswer } from "@harness-monorepo/contracts"

// App
import { messagesFor } from "@/locales"
import { MOVED_CODES, SUBSCRIPTION_WATCH_FOR_MS, offersOf, subscribePageOf, subscribeViewOf, subscriptionCheckDelayOf } from "./subscribe-view"

/** 15/10/2026, 12h in Brasília. */
const NOW = new Date("2026-10-15T15:00:00.000Z")

/** A page created on 15/10/2026, in trial until the 22nd, with nothing chosen. */
const trialing: StoreSubscription = {
  id: "sub-1",
  status: "TRIALING",
  trialStartedAt: "2026-10-15T14:00:00.000Z",
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
}

const plan = { id: "plan-1", slug: "beelink", name: "Beelink" }
const INVOICE = "https://sandbox.asaas.com/i/exemplo"
const enforced = (subscription: StoreSubscription | null): StoreSubscriptionAnswer => ({ billingEnforced: true, subscription })
const viewOf = (subscription: StoreSubscription | null) => subscribeViewOf(enforced(subscription), NOW, "pt-BR")

/** Example prices, not Beelink's: the screen holds no figure of its own. */
const catalog: PlanCatalog = {
  trialDays: 7,
  plans: [
    { id: "plan-0", slug: "outro", name: "Outro", cycles: [{ cycle: "MONTHLY", months: 1, priceCents: 100 }] },
    {
      id: "plan-1",
      slug: "beelink",
      name: "Beelink",
      cycles: [
        { cycle: "MONTHLY", months: 1, priceCents: 10000 },
        { cycle: "SEMIANNUAL", months: 6, priceCents: 54000 },
        { cycle: "ANNUAL", months: 12, priceCents: 96000 },
      ],
    },
  ],
}

describe("subscribeViewOf (BEELINK-293)", () => {
  it.each([
    ["billing switched off", { billingEnforced: false, subscription: trialing }],
    ["a page from before subscriptions", { billingEnforced: true, subscription: null }],
    ["a page that owes nothing", { billingEnforced: true, subscription: { ...trialing, status: "EXEMPT" as const } }],
  ])("leads back to the panel with %s: nothing is bought there", (_what, answer) => {
    expect(subscribeViewOf(answer, NOW, "pt-BR")).toEqual({ kind: "leave" })
  })

  it("offers the cycles to a page in trial, with its last day and the days it gives up", () => {
    expect(viewOf(trialing)).toEqual({
      kind: "choose",
      standing: { status: "TRIALING", lastDay: "22/10/2026", daysLeft: 7 },
      openInvoice: null,
      loss: { kind: "trial", daysLeft: 7 },
      coupon: true,
    })
  })

  it("carries on with an invoice already out, at the price it was chosen at", () => {
    const attempt = { ...trialing, plan, cycle: "SEMIANNUAL" as const, priceCents: 54000, invoiceUrl: INVOICE }

    expect(viewOf(attempt)).toMatchObject({ kind: "choose", openInvoice: { cycle: "SEMIANNUAL", priceCents: 54000, invoiceUrl: INVOICE } })
  })

  it("offers the cycles to a page whose trial is over, giving nothing up", () => {
    expect(viewOf({ ...trialing, status: "TRIAL_EXPIRED", trialDaysLeft: 0 })).toEqual({
      kind: "choose",
      standing: { status: "TRIAL_EXPIRED", lastDay: "22/10/2026" },
      openInvoice: null,
      loss: null,
      coupon: true,
    })
  })

  it("says until when a cancelled page still works, and that choosing again gives what is left of it up", () => {
    expect(viewOf({ ...trialing, status: "CANCELED", currentPeriodEndsAt: "2026-11-16T03:00:00.000Z" })).toMatchObject({
      kind: "choose",
      standing: { status: "CANCELED", until: "15/11/2026" },
      loss: { kind: "canceled" },
    })
    expect(viewOf({ ...trialing, status: "CANCELED", currentPeriodEndsAt: "2026-10-01T03:00:00.000Z" })).toMatchObject({ standing: { status: "CANCELED", until: null }, loss: null, coupon: false })
  })

  describe("a free period (BEELINK-224)", () => {
    /** A page in trial that used a coupon: free until 22/11, the month after the trial's last day. */
    const couponed = { ...trialing, freePeriodEndsAt: "2026-11-23T03:00:00.000Z", freePeriodLastDay: "2026-11-22", freePeriodDaysLeft: 38, couponRedeemedAt: "2026-10-15T15:00:00.000Z" }

    it("is said before the status, which would tell of a lock that does not come, and offers no second coupon", () => {
      expect(viewOf(couponed)).toEqual({
        kind: "choose",
        standing: { status: "FREE", lastDay: "22/11/2026", daysLeft: 38 },
        openInvoice: null,
        loss: { kind: "free", daysLeft: 38 },
        coupon: false,
      })
      // Past the trial the status says expired; the page is free all the same.
      expect(viewOf({ ...couponed, status: "TRIAL_EXPIRED", trialDaysLeft: 0 })).toMatchObject({ standing: { status: "FREE", lastDay: "22/11/2026" }, coupon: false })
    })

    it("offers a coupon to a page in a free month it did not get by one — the month the pages that already existed are given", () => {
      expect(viewOf({ ...trialing, status: "TRIAL_EXPIRED", freePeriodEndsAt: "2026-11-14T03:00:00.000Z", freePeriodLastDay: "2026-11-13", freePeriodDaysLeft: 29 })).toMatchObject({
        standing: { status: "FREE", lastDay: "13/11/2026", daysLeft: 29 },
        coupon: true,
      })
    })

    it("is the status again once it is over, and still offers no second coupon", () => {
      expect(viewOf({ ...couponed, status: "TRIAL_EXPIRED", freePeriodDaysLeft: null })).toMatchObject({ standing: { status: "TRIAL_EXPIRED" }, coupon: false })
    })

    it("tells a page that paid by what it paid for, free days or not", () => {
      const active = { ...couponed, status: "ACTIVE" as const, plan, cycle: "MONTHLY" as const, priceCents: 10000, currentPeriodEndsAt: "2026-11-16T03:00:00.000Z" }

      expect(viewOf(active)).toMatchObject({ kind: "active", standing: { status: "ACTIVE", paidUntil: "15/11/2026" } })
    })

    it("carries the invoice the page has open, which the coupon's field warns of", () => {
      expect(viewOf({ ...trialing, plan, cycle: "MONTHLY" as const, priceCents: 10000, invoiceUrl: INVOICE })).toMatchObject({ coupon: true, openInvoice: { invoiceUrl: INVOICE } })
    })
  })

  it("has nothing to sell a page whose paid period is running, and tells how it renews", () => {
    const active = { ...trialing, status: "ACTIVE" as const, plan, cycle: "MONTHLY" as const, priceCents: 10000, currentPeriodEndsAt: "2026-11-16T03:00:00.000Z" }

    expect(viewOf({ ...active, paymentMethod: "CREDIT_CARD", card: { brand: "VISA", last4: "4242" }, invoiceUrl: INVOICE })).toEqual({
      kind: "active",
      standing: { status: "ACTIVE", paidUntil: "15/11/2026" },
      // A card's renewal is charged by itself: its invoice is not one to pay.
      paid: { cycle: "MONTHLY", priceCents: 10000, paidUntil: "15/11/2026", method: "CREDIT_CARD", card: { brand: "VISA", last4: "4242" }, renewalInvoiceUrl: null },
    })
    expect(viewOf({ ...active, paymentMethod: "PIX", invoiceUrl: INVOICE })).toMatchObject({ paid: { method: "PIX", renewalInvoiceUrl: INVOICE } })
  })

  it("leads a renewal past its day to the invoice due, past due or suspended", () => {
    const due = { ...trialing, plan, cycle: "MONTHLY" as const, priceCents: 10000, currentPeriodEndsAt: "2026-10-15T03:00:00.000Z", invoiceUrl: INVOICE }

    expect(viewOf({ ...due, status: "PAST_DUE" })).toEqual({ kind: "due", standing: { status: "PAST_DUE", endedOn: "14/10/2026" }, invoiceUrl: INVOICE, cycle: "MONTHLY", priceCents: 10000 })
    expect(viewOf({ ...due, status: "SUSPENDED", invoiceUrl: null })).toMatchObject({ kind: "due", standing: { status: "SUSPENDED" }, invoiceUrl: null })
  })
})

describe("offersOf", () => {
  it("offers the plan on sale's cycles, each worked out from the catalogue and renewing as Asaas renews it", () => {
    const sale = offersOf(catalog, null, NOW, "pt-BR")

    expect(sale?.plan.slug).toBe("beelink")
    expect(sale?.offers).toEqual([
      { cycle: "MONTHLY", months: 1, totalCents: 10000, monthlyCents: 10000, savingCents: 0, savingPercent: 0, renewsOn: "15/11/2026" },
      { cycle: "SEMIANNUAL", months: 6, totalCents: 54000, monthlyCents: 9000, savingCents: 6000, savingPercent: 10, renewsOn: "15/04/2027" },
      { cycle: "ANNUAL", months: 12, totalCents: 96000, monthlyCents: 8000, savingCents: 24000, savingPercent: 20, renewsOn: "15/10/2027" },
    ])
  })

  it("tells no day for the cycle of an open invoice: its renewal counts from that invoice's due day", () => {
    expect(offersOf(catalog, "SEMIANNUAL", NOW, "pt-BR")?.offers.map((offer) => offer.renewsOn)).toEqual(["15/11/2026", null, "15/10/2027"])
  })

  it("counts today on Brasília's calendar: at 23h on the 31st, a month on is the 30th", () => {
    const lateOnThe31st = new Date("2026-11-01T02:00:00.000Z")

    expect(offersOf(catalog, null, lateOnThe31st, "pt-BR")?.offers[0]?.renewsOn).toBe("30/11/2026")
  })

  it("is null where the catalogue holds no plan on sale", () => {
    expect(offersOf({ trialDays: 7, plans: [] }, null, NOW, "pt-BR")).toBeNull()
    expect(offersOf({ trialDays: 7, plans: [{ ...plan, cycles: [] }] }, null, NOW, "pt-BR")).toBeNull()
  })
})

describe("the wait for a payment", () => {
  it("asks often at first and less as the wait grows, then stops asking by itself", () => {
    expect([0, 59_999, 60_000, 119_999, 120_000, 239_999, 240_000, SUBSCRIPTION_WATCH_FOR_MS - 1].map(subscriptionCheckDelayOf)).toEqual([10_000, 10_000, 15_000, 15_000, 30_000, 30_000, 60_000, 60_000])
    expect(subscriptionCheckDelayOf(SUBSCRIPTION_WATCH_FOR_MS)).toBe(false)
  })

  it("never asks more often than the API asks Asaas: once in ten seconds", () => {
    for (let waited = 0; waited < SUBSCRIPTION_WATCH_FOR_MS; waited += 5_000) expect(subscriptionCheckDelayOf(waited)).toBeGreaterThanOrEqual(10_000)
  })
})

describe("the codes and the address", () => {
  it("reads the subscription again for every code that says the page moved, and has a sentence for each", () => {
    const errors = messagesFor("pt-BR").web.errors

    for (const code of MOVED_CODES) expect(errors[code as keyof typeof errors]).toBeTruthy()
    expect([...MOVED_CODES].sort()).toEqual([
      "BILLING_COUPON_ALREADY_USED",
      "BILLING_COUPON_PAGE_PAID",
      "BILLING_NOT_ENFORCED",
      "BILLING_PAGE_ACTIVE",
      "BILLING_PAGE_EXEMPT",
      "BILLING_SUBSCRIPTION_MISSING",
      "BILLING_SUBSCRIPTION_PAID",
    ])
  })

  it("builds the screen's address from the slug, escaped", () => {
    expect(subscribePageOf("loja")).toBe("/admin/loja/subscribe")
    expect(subscribePageOf("loja da ana")).toBe("/admin/loja%20da%20ana/subscribe")
  })

  it("writes no amount in a billing sentence: amounts come from the catalogue", () => {
    for (const locale of ["pt-BR", "en"] as const) {
      const sentences = Object.entries(messagesFor(locale).web.errors).filter(([code]) => code.startsWith("BILLING_"))
      expect(sentences.filter(([, sentence]) => /R\$|\d/.test(sentence))).toEqual([])
    }
  })
})
