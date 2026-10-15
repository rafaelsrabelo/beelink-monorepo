// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { SubscriptionStrip } from "./subscription-strip"

const SUBSCRIBE = "/admin/loja-amora/subscribe"

describe("SubscriptionStrip (BEELINK-296)", () => {
  it("tells the trial's last days — two, tomorrow, today — that nothing is charged by itself, and leads to choosing a plan", async () => {
    const { container, rerender } = render(<SubscriptionStrip view={{ kind: "trial", daysLeft: 2, lastDay: "17/10/2026" }} subscribeHref={SUBSCRIBE} />)

    const strip = screen.getByRole("region", { name: "O teste grátis desta página termina daqui a 2 dias, em 17/10/2026." })
    expect(strip).toHaveTextContent("Nada é cobrado sozinho: para a página não travar, escolha um plano e pague.")
    expect(screen.getByRole("link", { name: "Escolher um plano" })).toHaveAttribute("href", SUBSCRIBE)
    await expectNoA11yViolations(container)

    rerender(<SubscriptionStrip view={{ kind: "trial", daysLeft: 1, lastDay: "17/10/2026" }} subscribeHref={SUBSCRIBE} />)
    expect(screen.getByRole("region", { name: "O teste grátis desta página termina amanhã, 17/10/2026." })).toBeInTheDocument()

    rerender(<SubscriptionStrip view={{ kind: "trial", daysLeft: 0, lastDay: "17/10/2026" }} subscribeHref={SUBSCRIBE} />)
    expect(screen.getByRole("region", { name: "O teste grátis desta página termina hoje." })).toBeInTheDocument()
  })

  it("tells the free time's last days in its own words: it is not a trial", () => {
    const { rerender } = render(<SubscriptionStrip view={{ kind: "free", daysLeft: 2, lastDay: "13/11/2026" }} subscribeHref={SUBSCRIBE} />)
    expect(screen.getByRole("region", { name: "O tempo grátis desta página termina daqui a 2 dias, em 13/11/2026." })).toHaveTextContent("Nada é cobrado sozinho")
    expect(screen.queryByText(/teste grátis/)).toBeNull()

    rerender(<SubscriptionStrip view={{ kind: "free", daysLeft: 1, lastDay: "13/11/2026" }} subscribeHref={SUBSCRIBE} />)
    expect(screen.getByRole("region", { name: "O tempo grátis desta página termina amanhã, 13/11/2026." })).toBeInTheDocument()

    rerender(<SubscriptionStrip view={{ kind: "free", daysLeft: 0, lastDay: "13/11/2026" }} subscribeHref={SUBSCRIBE} />)
    expect(screen.getByRole("region", { name: "O tempo grátis desta página termina hoje." })).toBeInTheDocument()
  })

  it("tells the grace: the renewal unpaid, the last day to pay, the boleto's delay, and leads to paying the renewal", async () => {
    const { container } = render(<SubscriptionStrip view={{ kind: "grace", payBy: "22/10/2026" }} subscribeHref={SUBSCRIBE} />)

    const strip = screen.getByRole("region", { name: "A renovação desta página não foi paga" })
    expect(strip).toHaveTextContent("Pague até 22/10/2026 para a página não travar.")
    expect(strip).toHaveTextContent("Se for pagar com boleto, pague antes: ele leva alguns dias úteis para ser confirmado.")
    expect(screen.getByRole("link", { name: "Pagar a renovação" })).toHaveAttribute("href", SUBSCRIBE)
    await expectNoA11yViolations(container)
  })

  it("speaks the reader's language", () => {
    render(<SubscriptionStrip view={{ kind: "grace", payBy: "10/22/2026" }} subscribeHref={SUBSCRIBE} messages={en} />)

    expect(screen.getByRole("region", { name: "This page's renewal was not paid" })).toHaveTextContent("Pay by 10/22/2026 so that the page does not lock.")
    expect(screen.getByRole("link", { name: "Pay the renewal" })).toBeInTheDocument()
  })
})
