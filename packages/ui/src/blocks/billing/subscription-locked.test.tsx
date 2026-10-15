// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { exampleOffers } from "./billing.fixtures"
import { SubscriptionLocked, type SubscriptionLockedProps } from "./subscription-locked"
import { SubscriptionLockedSkeleton } from "./subscription-locked-skeleton"

const plain = (text: string | null | undefined) => (text ?? "").replace(/[  ]/g, " ")

const BASE: SubscriptionLockedProps = {
  reason: "TRIAL_EXPIRED",
  endedOn: "13/10/2026",
  page: { name: "Loja Amora", logoUrl: null },
  shop: true,
  otherPages: false,
  plan: { name: "Beelink", offers: exampleOffers },
  subscribeHref: "/admin/loja-amora/subscribe",
  locale: "pt-BR",
}

describe("SubscriptionLocked (BEELINK-296)", () => {
  it("says the trial ended and when, what each period costs the page, and leads to the Assinar screen", async () => {
    const { container } = render(<SubscriptionLocked {...BASE} />)

    expect(screen.getByRole("heading", { level: 1, name: "Seu teste grátis acabou" })).toBeInTheDocument()
    expect(screen.getByText("Loja Amora")).toBeInTheDocument()
    expect(screen.getByText("O teste grátis desta página terminou em 13/10/2026, e nada foi cobrado. Para usá-la de novo, escolha um plano e pague a primeira fatura.")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Plano Beelink, por página" })).toBeInTheDocument()
    const prices = within(screen.getByRole("heading", { level: 2 }).parentElement as HTMLElement).getAllByRole("listitem").map((item) => plain(item.textContent))
    expect(prices).toEqual(["Mensal: R$ 100,00 por mês", "Semestral: R$ 540,00 a cada 6 meses, R$ 90,00 por mês", "Anual: R$ 960,00 a cada 12 meses, R$ 80,00 por mês"])
    expect(screen.getByText(/Com cartão de crédito, o plano renova sozinho/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Escolher um plano" })).toHaveAttribute("href", "/admin/loja-amora/subscribe")
    await expectNoA11yViolations(container)
  })

  it.each([
    ["SUSPENDED", "A renovação não foi paga", "A renovação desta página não foi paga, e o prazo para pagar terminou em 22/10/2026. Para usá-la de novo, pague a fatura em aberto.", "Pagar a renovação"],
    ["CANCELED", "Sua assinatura foi cancelada", "A assinatura desta página foi cancelada, e o período pago terminou em 22/10/2026. Para usá-la de novo, escolha um plano e pague.", "Escolher um plano"],
    ["FREE_PERIOD_OVER", "Seu mês grátis acabou", "O mês grátis desta página terminou em 22/10/2026, e nada foi cobrado. Para usá-la de novo, escolha um plano e pague a primeira fatura.", "Escolher um plano"],
  ] as const)("tells %s by its own title, text and way out", (reason, title, text, action) => {
    render(<SubscriptionLocked {...BASE} reason={reason} endedOn="22/10/2026" />)

    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: action })).toHaveAttribute("href", "/admin/loja-amora/subscribe")
  })

  it("says it without a day where there is none to say", () => {
    render(<SubscriptionLocked {...BASE} reason="CANCELED" endedOn={null} />)

    expect(screen.getByText("A assinatura desta página foi cancelada. Para usá-la de novo, escolha um plano e pague.")).toBeInTheDocument()
  })

  it("tells a shop's owner that the customers keep their orders, and one with other pages that those stay open", () => {
    const { rerender } = render(<SubscriptionLocked {...BASE} />)
    expect(screen.getByText("Quem já comprou continua vendo os próprios pedidos.")).toBeInTheDocument()
    expect(screen.queryByText("Suas outras páginas continuam funcionando normalmente.")).toBeNull()
    expect(screen.getByText(/o painel desta página fica fechado/)).toBeInTheDocument()
    expect(screen.getByText(/Nada foi apagado/)).toBeInTheDocument()

    rerender(<SubscriptionLocked {...BASE} shop={false} otherPages />)
    expect(screen.queryByText("Quem já comprou continua vendo os próprios pedidos.")).toBeNull()
    expect(screen.getByText("Suas outras páginas continuam funcionando normalmente.")).toBeInTheDocument()
  })

  it("stands the plan's lines in as a skeleton while they are read, and leaves them out where no plan is on sale", () => {
    const { rerender } = render(<SubscriptionLocked {...BASE} plan={null} planPending />)
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull()
    expect(screen.queryByText(/por mês/)).toBeNull()
    expect(screen.getByRole("link", { name: "Escolher um plano" })).toBeInTheDocument()

    rerender(<SubscriptionLocked {...BASE} plan={null} />)
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull()
    expect(screen.getByText(/Com cartão de crédito/)).toBeInTheDocument()
  })

  it("draws no page line while the account's pages are read", () => {
    render(<SubscriptionLocked {...BASE} page={null} />)

    expect(screen.queryByText("Loja Amora")).toBeNull()
    expect(screen.getByRole("heading", { level: 1, name: "Seu teste grátis acabou" })).toBeInTheDocument()
  })

  it("speaks the reader's language, its amounts written as they write them", () => {
    render(<SubscriptionLocked {...BASE} locale="en" messages={en} />)

    expect(screen.getByRole("heading", { level: 1, name: "Your free trial is over" })).toBeInTheDocument()
    expect(plain(screen.getByText(/^Six-monthly/).textContent)).toBe("Six-monthly: R$540.00 every 6 months, R$90.00 a month")
  })
})

describe("SubscriptionLockedSkeleton (BEELINK-296)", () => {
  it("is hidden from a reader, who is told by the screen what is being read", () => {
    const { container } = render(<SubscriptionLockedSkeleton />)

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
  })
})
