// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// UI
import { LandingFaq } from "@harness-monorepo/ui/blocks/landing/landing-faq"
import { LandingPlans } from "@harness-monorepo/ui/blocks/landing/landing-plans"

// App
import { messagesFor } from "@/locales"
import { PLAN_PRICES } from "./plans"

/** `Intl` parts "R$" from its number with a no-break space; a sentence is compared with an ordinary one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/ /g, " ")

/** The figures a period's radio is described by: the month's amount, the amount paid, the saving. */
function figuresOf(period: string) {
  const radio = screen.getByRole("radio", { name: new RegExp(`^${period}`) })
  return [...document.getElementById(radio.getAttribute("aria-describedby")!)!.querySelectorAll("p")].map((line) => plain(line.textContent))
}

/**
 * The prices as they were decided on 12/10/2026 (épico AA, BEELINK-316), read off the page the way a
 * visitor reads them. The month's share and the saving are not in `plans.ts`: they are worked out,
 * and this is where they are held to the figures the decision names — R$ 53,90 and 10%, R$ 47,90
 * and 20%. A price changed on purpose changes here too.
 */
describe("PLAN_PRICES, on the landing", () => {
  it("sells Beelink at R$ 59,90 a month, with seven days free and no card", () => {
    render(<LandingPlans prices={PLAN_PRICES} locale="pt-BR" signupHref="/signup" />)

    expect(figuresOf("Mensal")).toEqual(["R$ 59,90 por mês", "Pago mês a mês."])
    expect(screen.getByText("7 dias grátis, sem cartão")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Testar 7 dias grátis" })).toHaveAttribute("href", "/signup")
  })

  it("comes to R$ 53,90 a month and 10% less over six months, R$ 47,90 and 20% less over the year", () => {
    render(<LandingPlans prices={PLAN_PRICES} locale="pt-BR" signupHref="/signup" />)

    expect(figuresOf("6 meses")).toEqual(["R$ 53,90 por mês", "R$ 323,40 pelos 6 meses.", "Você economiza R$ 36,00 (10%) em relação ao mensal."])
    expect(figuresOf("Anual")).toEqual(["R$ 47,90 por mês", "R$ 574,80 pelo ano.", "Você economiza R$ 144,00 (20%) em relação ao mensal."])
    expect(screen.getAllByRole("radio").map((period) => period.closest("label")?.textContent)).toEqual(["Mensal", "6 meses-10%", "Anual-20%"])
  })

  it("announces Beelink with Beelia at R$ 89,90 a month", () => {
    render(<LandingPlans prices={PLAN_PRICES} locale="pt-BR" signupHref="/signup" />)

    const card = screen.getByRole("heading", { level: 3, name: "Beelink + Beelia" }).closest("li")!
    expect(plain(card.textContent)).toContain("R$ 89,90 por mês")
    expect(within(card).getByText("Em breve")).toBeInTheDocument()
  })

  it("answers \"Quanto custa?\" with the same amounts, and names the trial's seven days", () => {
    render(<LandingFaq prices={PLAN_PRICES} locale="pt-BR" />)

    expect(plain(screen.getByText("Quanto custa?").closest("details")?.querySelector("p")?.textContent)).toBe(
      "O plano Beelink custa R$ 59,90 por mês. Pagando 6 meses de uma vez sai por R$ 323,40, que dá R$ 53,90 por mês; pagando o ano, R$ 574,80, que dá R$ 47,90 por mês. O plano com a Beelia ainda não está disponível e vai custar R$ 89,90 por mês.",
    )
    expect(screen.getByText("Como funciona o teste de 7 dias?")).toBeInTheDocument()
  })

  /** What a search result and a shared link say of the landing is written here, in the app: it names no price either. */
  it.each(["pt-BR", "en"] as const)("is the one place an amount is written: the page's own sentences name none, in %s", (locale) => {
    const sentences = Object.values(messagesFor(locale).web.landing)

    expect(sentences.filter((sentence) => /R\$|\d[.,]\d{2}(?!\d)|\d+\s*(dias?|days?)\b/i.test(sentence))).toEqual([])
  })
})
