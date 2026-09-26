// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCountdown } from "./storefront-countdown"

const END = "2026-10-01T02:59:00.000Z"
const NOW = Date.parse(END) - ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000

describe("StorefrontCountdown", () => {
  it("draws what is left as days, hours, minutes and seconds", () => {
    const { container } = render(<StorefrontCountdown layout="BAND" title="A oferta termina em" endsAt={END} now={NOW} />)

    expect(container.querySelector("[aria-hidden]")).toHaveTextContent("02dias03horas04min05seg")
  })

  it("is a timer that announces nothing each second, and says its end once, on the shop's clock", () => {
    render(<StorefrontCountdown layout="BAND" endsAt={END} now={NOW} />)

    const timer = screen.getByRole("timer")
    expect(timer).not.toHaveAttribute("aria-live")
    expect(screen.getByText("Termina em 30 de setembro, às 23:59")).toHaveClass("sr-only")
  })

  it("waits with dashes and says the date plainly before the page's script has a clock", () => {
    const { container } = render(<StorefrontCountdown layout="BLOCK" endsAt={END} now={null} />)

    expect(container.querySelector("[aria-hidden]")).toHaveTextContent("--dias--horas--min--seg")
    expect(screen.getByText("Termina em 30 de setembro, às 23:59")).not.toHaveClass("sr-only")
  })

  it("says it has ended, where the editor draws one the shop no longer shows", () => {
    render(<StorefrontCountdown layout="BAND" endsAt={END} now={Date.parse(END)} ended />)

    expect(screen.getByText("Encerrada")).toBeInTheDocument()
  })

  it("keeps round corners on a strip that does not reach the edges", () => {
    const { rerender } = render(<StorefrontCountdown layout="BAND" endsAt={END} now={NOW} />)
    expect(screen.getByRole("timer")).toHaveClass("rounded-2xl")

    rerender(<StorefrontCountdown layout="BAND" endsAt={END} now={NOW} bleed />)
    expect(screen.getByRole("timer")).not.toHaveClass("rounded-2xl")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <StorefrontCountdown layout="BLOCK" title="A oferta termina em" subtitle="Só esta semana" endsAt={END} now={NOW} />
      </main>,
    )

    await expectNoA11yViolations(container)
  })
})
