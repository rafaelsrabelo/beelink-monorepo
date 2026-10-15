// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// UI
import type { SubscriptionCardStanding, SubscriptionCardView } from "@harness-monorepo/ui/lib/subscription"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AdminPlanCard } from "./admin-plan-card"

const SUBSCRIBE = "/admin/lessari/subscribe"

const view = (standing: SubscriptionCardStanding, overrides: Partial<SubscriptionCardView> = {}): SubscriptionCardView => ({ plan: "Beelink", standing, urgent: false, ...overrides })

function renderCard(overrides: Partial<Parameters<typeof AdminPlanCard>[0]> = {}) {
  return render(<AdminPlanCard view={view({ status: "TRIALING", daysLeft: 4 })} href={SUBSCRIBE} {...overrides} />)
}

describe("AdminPlanCard (BEELINK-220)", () => {
  it("names the plan and where the page stands, as one link to the Assinar screen", () => {
    renderCard()

    const card = screen.getByRole("link", { name: "Plano Beelink, Teste grátis: 4 dias restantes" })
    expect(card).toHaveAttribute("href", SUBSCRIBE)
    expect(screen.getAllByRole("link")).toHaveLength(1)
    // The two lines drawn, and their name given whole: jsdom lays nothing out, and Chrome would read a
    // comma hidden between two blocks with a space before it.
    expect(card).toHaveAttribute("aria-label", "Plano Beelink, Teste grátis: 4 dias restantes")
    expect(card).toHaveTextContent(/^Plano BeelinkTeste grátis: 4 dias restantes$/)
  })

  it.each<[string, SubscriptionCardStanding, string]>([
    ["a trial with days to go", { status: "TRIALING", daysLeft: 2 }, "Teste grátis: 2 dias restantes"],
    ["a trial ending tomorrow", { status: "TRIALING", daysLeft: 1 }, "Teste grátis: termina amanhã"],
    ["a trial's last day", { status: "TRIALING", daysLeft: 0 }, "Teste grátis: termina hoje"],
    ["a free time with days to go, by its last day", { status: "FREE", lastDay: "13/11/2026", daysLeft: 29 }, "Grátis até 13/11/2026"],
    ["a free time ending tomorrow", { status: "FREE", lastDay: "13/11/2026", daysLeft: 1 }, "Grátis até amanhã"],
    ["a free time's last day", { status: "FREE", lastDay: "13/11/2026", daysLeft: 0 }, "Grátis até hoje"],
    ["a trial over where nothing locks", { status: "TRIAL_EXPIRED" }, "Teste grátis encerrado"],
    ["a page paid, by the renewal's day", { status: "ACTIVE", renewsOn: "12/11/2026" }, "Renova em 12/11/2026"],
    ["a page paid with no day to say", { status: "ACTIVE", renewsOn: null }, "Em dia"],
    ["a renewal unpaid", { status: "PAST_DUE" }, "Pagamento em atraso"],
    ["a cancelled page still used", { status: "CANCELED", until: "12/11/2026" }, "Cancelado: acesso até 12/11/2026"],
    ["a cancelled page whose time is over", { status: "CANCELED", until: null }, "Assinatura cancelada"],
    ["a locked page, whatever the reason", { status: "LOCKED" }, "Página travada"],
  ])("says %s in its own words", (_case, standing, sentence) => {
    renderCard({ view: view(standing) })

    expect(screen.getByRole("link", { name: `Plano Beelink, ${sentence}` })).toBeInTheDocument()
  })

  it("names the page's subscription where no plan's name is known", () => {
    renderCard({ view: view({ status: "LOCKED" }, { plan: null }) })

    expect(screen.getByRole("link", { name: "Assinatura da página, Página travada" })).toBeInTheDocument()
  })

  it("wears the warning's colours only when told to, and the rail's quiet ones otherwise", () => {
    const { rerender } = renderCard({ view: view({ status: "TRIALING", daysLeft: 1 }, { urgent: true }) })
    expect(screen.getByRole("link")).toHaveClass("bg-warning", "text-warning-foreground")

    rerender(<AdminPlanCard view={view({ status: "TRIALING", daysLeft: 1 })} href={SUBSCRIBE} />)
    expect(screen.getByRole("link")).not.toHaveClass("bg-warning")
    expect(screen.getByRole("link")).toHaveClass("bg-shell-surface")
  })

  // jsdom lays nothing out: what is asserted is the name, which a collapsed rail must not change, and the
  // words a pointer user gets back.
  it("keeps its name when the rail is icons only, and gives a pointer user the words back on hover", () => {
    renderCard({ collapsed: true })

    const card = screen.getByRole("link", { name: "Plano Beelink, Teste grátis: 4 dias restantes" })
    expect(card).toHaveAttribute("title", "Plano Beelink, Teste grátis: 4 dias restantes")
  })

  it("carries no title while its words are on screen", () => {
    renderCard()

    expect(screen.getByRole("link")).not.toHaveAttribute("title")
  })

  it("is the current page on the Assinar screen, and only there", () => {
    const { rerender } = renderCard({ current: true })
    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page")

    rerender(<AdminPlanCard view={view({ status: "TRIALING", daysLeft: 4 })} href={SUBSCRIBE} />)
    expect(screen.getByRole("link")).not.toHaveAttribute("aria-current")
  })

  it("tells the drawer it was chosen", async () => {
    const onNavigate = vi.fn()
    renderCard({ onNavigate })

    await userEvent.click(screen.getByRole("link"))

    expect(onNavigate).toHaveBeenCalled()
  })

  it("is its skeleton while the plan is read: nothing to follow, and nothing for a reader", () => {
    const { container } = renderCard({ view: null })

    expect(screen.queryByRole("link")).toBeNull()
    expect(container.querySelector('[data-slot="plan-card-skeleton"]')).toHaveAttribute("aria-hidden", "true")
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3)
  })

  it("keeps only the icon's place in the skeleton of a collapsed rail", () => {
    const { container } = renderCard({ view: null, collapsed: true })

    // The two lines' column is hidden above `lg`, where the rail narrows: the icon's pulse is what is left.
    expect(container.querySelector('[data-slot="plan-card-skeleton"] > div:last-child')).toHaveClass("lg:hidden")
    expect(container.querySelector('[data-slot="plan-card-skeleton"] > [data-slot="skeleton"]')).not.toHaveClass("lg:hidden")
  })

  // The standing moves by itself — a payment read, a coupon, a lock — and the menu does not speak for it.
  it("announces nothing by itself when the standing changes", () => {
    const { container, rerender } = renderCard()
    rerender(<AdminPlanCard view={view({ status: "LOCKED" }, { urgent: true })} href={SUBSCRIBE} />)

    expect(screen.getByRole("link", { name: "Plano Beelink, Página travada" })).toBeInTheDocument()
    expect(container.querySelector("[aria-live], [role=status], [role=alert]")).toBeNull()
  })

  it("speaks the reader's language", () => {
    renderCard({ view: view({ status: "TRIALING", daysLeft: 0 }), messages: en })

    expect(screen.getByRole("link", { name: "Beelink plan, Free trial: ends today" })).toBeInTheDocument()
  })

  it("has no accessibility violations, quiet or warning, open or collapsed", async () => {
    await expectNoA11yViolations(renderCard().container)
    await expectNoA11yViolations(renderCard({ view: view({ status: "LOCKED" }, { urgent: true }) }).container)
    await expectNoA11yViolations(renderCard({ collapsed: true }).container)
    await expectNoA11yViolations(renderCard({ view: view({ status: "PAST_DUE" }, { urgent: true }), collapsed: true }).container)
  })
})
