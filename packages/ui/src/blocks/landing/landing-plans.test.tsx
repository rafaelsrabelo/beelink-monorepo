// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Locales
import { en, ptBR } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LandingPlans } from "./landing-plans"
import { examplePlanPrices } from "./landing-plans.fixtures"

/** `Intl` parts "R$" from its number with a no-break space; a sentence is compared with an ordinary one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/ /g, " ")

/** Every string a dictionary holds under one key, however deep. */
function sentencesOf(value: unknown): string[] {
  if (typeof value === "string") return [value]
  return typeof value === "object" && value !== null ? Object.values(value).flatMap(sentencesOf) : []
}

const cardOf = (name: string) => screen.getByRole("heading", { level: 3, name }).closest("li")!
/** The figures a period's radio is described by. */
const figuresOf = (radio: HTMLElement) => document.getElementById(radio.getAttribute("aria-describedby")!)!

function renderPlans(props: Partial<Parameters<typeof LandingPlans>[0]> = {}) {
  return render(<LandingPlans prices={examplePlanPrices} locale="pt-BR" signupHref="/signup" {...props} />)
}

describe("LandingPlans", () => {
  it("is the section the header's link travels to, under a heading in two weights", () => {
    const { container } = renderPlans()

    const section = container.querySelector("section")!
    expect(section).toHaveAttribute("id", "planos")
    expect(within(section).getByRole("heading", { level: 2, name: "Escolha o seu plano" })).toBeInTheDocument()
    expect(within(section).getByText("Comece com 14 dias grátis, sem cartão. Depois você escolhe como pagar.")).toBeInTheDocument()
  })

  it("says the free trial first on Beelink's card, then the month's price, and leads to the sign-up", () => {
    renderPlans()

    const card = cardOf("Beelink")
    expect(card.firstElementChild).toHaveTextContent("14 dias grátis, sem cartão")
    expect(card.firstElementChild).toHaveClass("bg-brand-yellow")
    expect(plain(figuresOf(within(card).getByRole("radio", { name: "Mensal" })).querySelector("p")?.textContent)).toBe("R$ 100,00 por mês")
    expect(within(card).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([["Testar 14 dias grátis", "/signup"]])
  })

  it("offers the three periods as one group of radios under a legend, the monthly one chosen", () => {
    renderPlans()

    const periods = within(screen.getByRole("group", { name: "Período do plano" })).getAllByRole("radio")
    expect(periods.map((period) => period.closest("label")?.textContent)).toEqual(["Mensal", "6 meses-10%", "Anual-20%"])
    // The badge is drawn only: a period is named by its name, and its saving is said in the sentence that describes it.
    expect(periods.map((period) => period.closest("label")?.querySelector("[aria-hidden='true']")?.textContent)).toEqual([undefined, "-10%", "-20%"])
    expect(periods.map((period) => period.getAttribute("aria-describedby") !== null)).toEqual([true, true, true])
    expect(periods.map((period) => (period as HTMLInputElement).checked)).toEqual([true, false, false])
    expect(new Set(periods.map((period) => period.getAttribute("name"))).size).toBe(1)
  })

  /** The amount paid, what it comes to a month and what it saves: worked out from the prices, for a reader too. */
  it("describes each period by its own figures, so a reader hears them on reaching it", () => {
    renderPlans()

    const figures = screen.getAllByRole("radio").map((period) => [...figuresOf(period).querySelectorAll("p")].map((line) => plain(line.textContent)))
    expect(figures).toEqual([
      ["R$ 100,00 por mês", "Pago mês a mês."],
      ["R$ 90,00 por mês", "R$ 540,00 pelos 6 meses.", "Você economiza R$ 60,00 (10%) em relação ao mensal."],
      ["R$ 80,00 por mês", "R$ 960,00 pelo ano.", "Você economiza R$ 240,00 (20%) em relação ao mensal."],
    ])
    expect(screen.getByRole("radio", { name: "Anual" })).toHaveAccessibleDescription(/^R\$\s80,00 por mês R\$\s960,00 pelo ano\. Você economiza R\$\s240,00 \(20%\) em relação ao mensal\.$/)
  })

  /**
   * No script changes the figures: the stylesheet shows the ones whose radio is checked, which jsdom
   * cannot draw — a browser was asked (the plan has what it showed). What is held here is the wiring:
   * the three share a cell, each hidden but for the class that answers its own radio.
   */
  it("shows a period's figures by its radio alone, in a cell the three share", () => {
    renderPlans()

    const group = screen.getByRole("group", { name: "Período do plano" })
    expect(group).toHaveClass("group/periods")
    for (const period of within(group).getAllByRole("radio")) {
      expect(figuresOf(period)).toHaveClass("invisible", "col-start-1", "row-start-1", `group-has-[[value=${(period as HTMLInputElement).value}]:checked]/periods:visible`)
      expect(group).toContainElement(figuresOf(period))
    }
  })

  it("changes the period with the pointer or with the arrow keys, one at a time", async () => {
    const user = userEvent.setup()
    renderPlans()
    const checked = () => screen.getAllByRole<HTMLInputElement>("radio").map((period) => period.checked)

    await user.click(screen.getByText("Anual"))
    expect(checked()).toEqual([false, false, true])

    await user.keyboard("{ArrowLeft}")
    expect(checked()).toEqual([false, true, false])
    expect(screen.getByRole("radio", { name: /6 meses/ })).toHaveFocus()
  })

  /** Beelia does not exist yet: a card of it that could be pressed would be a stop with nothing behind it. */
  it("announces Beelink with Beelia by its price, as still to come, with nothing to press", () => {
    renderPlans()

    const card = cardOf("Beelink + Beelia")
    expect(within(card).getByText("Em breve")).toBeInTheDocument()
    expect(plain(card.textContent)).toContain("R$ 150,00 por mês")
    expect(within(card).getByText("Tudo do plano Beelink, mais a Beelia no WhatsApp da loja.")).toBeInTheDocument()
    expect(card.querySelector("a, button, input, [tabindex], [role='link'], [role='button']")).toBeNull()
  })

  it("lists what each plan includes under a heading of its own", () => {
    renderPlans()

    for (const [name, includes] of [
      ["Beelink", ptBR.landing.plans.beelink.includes],
      ["Beelink + Beelia", ptBR.landing.plans.withBeelia.includes],
    ] as const) {
      const list = within(cardOf(name)).getByRole("heading", { level: 4, name: "O que inclui" }).nextElementSibling as HTMLElement
      expect(within(list).getAllByRole("listitem").map((item) => item.textContent)).toEqual([...includes])
    }
    expect(ptBR.landing.plans.beelink.includes).toHaveLength(12)
  })

  it("says what follows the trial: a locked account, and no charge on its own", () => {
    renderPlans()

    expect(screen.getByText("Passados os 14 dias, a conta fica travada até você escolher um plano e pagar. Nada é cobrado sozinho.")).toBeInTheDocument()
  })

  /**
   * The prices live in one place, and it is not here. The ones handed over are not Beelink's, so an
   * amount, a percentage or a trial written by hand in the block or in a sentence would stand on the
   * page beside them.
   */
  it("writes no figure of its own: every amount, share and trial on the page comes from what it was handed", () => {
    const { container } = renderPlans()
    const page = plain(container.textContent)

    expect([...new Set(page.match(/R\$ ?[\d.]+,\d{2}/g))].sort()).toEqual(["R$ 100,00", "R$ 150,00", "R$ 240,00", "R$ 540,00", "R$ 60,00", "R$ 80,00", "R$ 90,00", "R$ 960,00"])
    expect([...new Set(page.match(/\d+ ?%/g))].sort()).toEqual(["10%", "20%"])
    expect([...new Set(page.match(/\d+ dias/g))]).toEqual(["14 dias"])
    expect(page).not.toMatch(/[{}]/)
  })

  it("follows the prices it is handed", () => {
    renderPlans({ prices: { trialDays: 30, beelink: { monthly: 20000, semiannual: 90000, annual: 120000 }, withBeelia: { monthly: 31000 } } })

    expect(plain(figuresOf(screen.getByRole("radio", { name: /Anual/ })).textContent)).toBe("R$ 100,00 por mêsR$ 1.200,00 pelo ano.Você economiza R$ 1.200,00 (50%) em relação ao mensal.")
    expect(plain(cardOf("Beelink + Beelia").textContent)).toContain("R$ 310,00 por mês")
    expect(screen.getByRole("link", { name: "Testar 30 dias grátis" })).toBeInTheDocument()
  })

  /** A price or a trial typed into a sentence is a second copy, and the one that is forgotten when the first changes. */
  it.each([
    ["pt-BR", ptBR],
    ["en", en],
  ])("has no amount and no trial's length written in a landing sentence, in %s", (_, messages) => {
    const sentences = sentencesOf(messages.landing)

    expect(sentences.filter((sentence) => /R\$|\d[.,]\d{2}(?!\d)/.test(sentence))).toEqual([])
    expect(sentences.filter((sentence) => /\d+\s*(dias?|days?)\b/i.test(sentence))).toEqual([])
  })

  it("says everything in the language it is handed, amounts included", () => {
    const { container } = renderPlans({ locale: "en", messages: en })

    expect(screen.getByRole("heading", { level: 2, name: "Choose your plan" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Try 14 days free" })).toHaveAttribute("href", "/signup")
    expect(figuresOf(screen.getByRole("radio", { name: /Yearly/ }))).toHaveTextContent("R$80.00 a month")
    expect(within(cardOf("Beelink + Beelia")).getByText("Coming soon")).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/[{}]/)
  })

  it("has no accessibility violations", async () => {
    const { container } = renderPlans()

    await expectNoA11yViolations(container)
  })
})
