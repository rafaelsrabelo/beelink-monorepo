// Libs
import { describe, expect, it } from "vitest"

// Block
import { LANDING_PLAN_PERIODS, planOfferOf, planPercent, planValuesOf, type LandingPlanPrices } from "./landing-plan-offers"
import { examplePlanPrices } from "./landing-plans.fixtures"

/** `Intl` puts a no-break space between "R$" and the number, so a price never breaks across two lines. */
const plain = (text: string) => text.replace(/ /g, " ")

describe("planOfferOf", () => {
  it("works a period's month, its saving and the saving's share out of the two amounts", () => {
    expect(LANDING_PLAN_PERIODS.map((period) => planOfferOf(examplePlanPrices, period))).toEqual([
      { period: "monthly", totalCents: 10000, monthlyCents: 10000, savingCents: 0, savingPercent: 0 },
      { period: "semiannual", totalCents: 54000, monthlyCents: 9000, savingCents: 6000, savingPercent: 10 },
      { period: "annual", totalCents: 96000, monthlyCents: 8000, savingCents: 24000, savingPercent: 20 },
    ])
  })

  /**
   * 431,99 over six months is 71,998… a month, and 9,89% under six months at 79,90. Said as 71,99
   * and 10% it would promise a cent and a fraction of a point that nobody gets.
   */
  it("rounds the month's share up and the saving's share down, never in its own favour", () => {
    const prices: LandingPlanPrices = { ...examplePlanPrices, beelink: { monthly: 7990, semiannual: 43199, annual: 95880 } }

    expect(planOfferOf(prices, "semiannual")).toMatchObject({ monthlyCents: 7200, savingCents: 4741, savingPercent: 9 })
  })

  it("claims no saving of a period that costs as much as paying month by month, or more", () => {
    const prices: LandingPlanPrices = { ...examplePlanPrices, beelink: { monthly: 7990, semiannual: 47940, annual: 95881 } }

    expect(planOfferOf(prices, "semiannual")).toMatchObject({ savingCents: 0, savingPercent: 0 })
    expect(planOfferOf(prices, "annual")).toMatchObject({ savingCents: 0, savingPercent: 0 })
  })
})

describe("planValuesOf", () => {
  it("fills a sentence's placeholders with the amounts as the reader's language writes them", () => {
    const values = planValuesOf(examplePlanPrices, "pt-BR")

    expect(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, plain(value)]))).toEqual({
      days: "14",
      monthly: "R$ 100,00",
      semiannual: "R$ 540,00",
      semiannualMonthly: "R$ 90,00",
      annual: "R$ 960,00",
      annualMonthly: "R$ 80,00",
      withBeelia: "R$ 150,00",
    })
    expect(planValuesOf(examplePlanPrices, "en")).toMatchObject({ monthly: "R$100.00", annualMonthly: "R$80.00" })
  })

  it("keeps an amount on one line: the currency and the number are never parted", () => {
    expect(planValuesOf(examplePlanPrices, "pt-BR").monthly).toBe("R$ 100,00")
  })
})

describe("planPercent", () => {
  it.each(["pt-BR", "en"])("writes a whole share in %s", (locale) => {
    expect(planPercent(20, locale)).toBe("20%")
  })
})
