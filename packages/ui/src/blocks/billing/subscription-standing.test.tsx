// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// UI
import type { SubscriptionStandingView } from "@harness-monorepo/ui/lib/subscription"

// Locales
import { en } from "@harness-monorepo/ui/locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { SubscriptionSkeleton } from "./subscription-skeleton"
import { SubscriptionStanding } from "./subscription-standing"

describe("SubscriptionStanding (BEELINK-293)", () => {
  it("titles the page with the plan's name, and says the plan is the page's own", async () => {
    const { container } = render(<SubscriptionStanding plan="Beelink" standing={{ status: "TRIALING", lastDay: "22/10/2026", daysLeft: 7 }} />)

    expect(screen.getByRole("heading", { level: 1, name: "Plano Beelink" })).toBeInTheDocument()
    expect(screen.getByText("O valor é por página: cada página que você cria tem o seu teste grátis e o seu plano.")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("has a title of its own where the catalogue holds no plan on sale", () => {
    render(<SubscriptionStanding plan={null} standing={{ status: "TRIAL_EXPIRED", lastDay: "22/10/2026" }} />)

    expect(screen.getByRole("heading", { level: 1, name: "Assinatura da página" })).toBeInTheDocument()
  })

  it.each<[SubscriptionStandingView, string, string]>([
    [{ status: "TRIALING", lastDay: "22/10/2026", daysLeft: 7 }, "Em teste", "O teste grátis vai até 22/10/2026: faltam 7 dias. Ele não pede cartão e nada é cobrado sozinho: quando acabar, a página trava e sai do ar até você assinar."],
    [{ status: "TRIALING", lastDay: "22/10/2026", daysLeft: 1 }, "Em teste", "O teste grátis vai até amanhã, 22/10/2026. Ele não pede cartão e nada é cobrado sozinho: quando acabar, a página trava e sai do ar até você assinar."],
    [{ status: "TRIALING", lastDay: "22/10/2026", daysLeft: 0 }, "Em teste", "O teste grátis termina hoje, 22/10/2026. Ele não pede cartão e nada é cobrado sozinho: quando acabar, a página trava e sai do ar até você assinar."],
    [{ status: "TRIAL_EXPIRED", lastDay: "22/10/2026" }, "Teste encerrado", "O teste grátis terminou em 22/10/2026. Para usar a página, escolha um plano e pague."],
    [{ status: "ACTIVE", paidUntil: "15/11/2026" }, "Em dia", "A página está paga até 15/11/2026."],
    [{ status: "ACTIVE", paidUntil: null }, "Em dia", "A página está em dia."],
    [{ status: "PAST_DUE", endedOn: "15/11/2026" }, "Pagamento em atraso", "A renovação venceu em 15/11/2026 e ainda não foi paga. Pague a fatura para a página não travar."],
    [{ status: "PAST_DUE", endedOn: null }, "Pagamento em atraso", "A renovação ainda não foi paga. Pague a fatura para a página não travar."],
    [{ status: "SUSPENDED" }, "Suspensa", "A renovação não foi paga no prazo, e a página está travada e fora do ar. Pague a fatura em aberto para ela voltar."],
    [{ status: "CANCELED", until: "15/11/2026" }, "Cancelada", "A assinatura foi cancelada. A página funciona até 15/11/2026 e depois trava, até você assinar de novo."],
    [{ status: "CANCELED", until: null }, "Cancelada", "A assinatura foi cancelada, e a página está travada e fora do ar. Para usá-la de novo, escolha um plano e pague."],
  ])("says %o as its badge and a sentence", (standing, badge, sentence) => {
    render(<SubscriptionStanding plan="Beelink" standing={standing} />)

    expect(screen.getByText(badge)).toBeInTheDocument()
    expect(screen.getByText(sentence)).toBeInTheDocument()
  })

  it("draws a page up to date in green, and one that owes in red", () => {
    const { rerender } = render(<SubscriptionStanding plan="Beelink" standing={{ status: "ACTIVE", paidUntil: "15/11/2026" }} />)
    expect(screen.getByText("Em dia")).toHaveAttribute("data-variant", "success")

    rerender(<SubscriptionStanding plan="Beelink" standing={{ status: "PAST_DUE", endedOn: null }} />)
    expect(screen.getByText("Pagamento em atraso")).toHaveAttribute("data-variant", "destructive")
  })

  it("speaks the reader's language", () => {
    render(<SubscriptionStanding plan="Beelink" standing={{ status: "TRIALING", lastDay: "10/22/2026", daysLeft: 3 }} messages={en} />)

    expect(screen.getByRole("heading", { level: 1, name: "Beelink plan" })).toBeInTheDocument()
    expect(screen.getByText("The free trial runs until 10/22/2026: 3 days left. It asks for no card and nothing is charged by itself: when it ends, the page locks and goes offline until you subscribe.")).toBeInTheDocument()
  })
})

describe("SubscriptionSkeleton", () => {
  it("stands in the screen's shape and is not read out", () => {
    const { container } = render(<SubscriptionSkeleton />)

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    expect(screen.queryByRole("heading")).toBeNull()
  })
})
