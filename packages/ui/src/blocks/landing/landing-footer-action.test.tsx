// Libs
import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LandingFooter } from "./landing-footer"
import { LandingFooterAction } from "./landing-footer-action"

/** BEELINK-319 */
describe("LandingFooterAction", () => {
  it("is a button, named by its words, that does what it was handed", () => {
    const onClick = vi.fn()
    render(<LandingFooterAction onClick={onClick}>Cookies</LandingFooterAction>)

    const button = screen.getByRole("button", { name: "Cookies" })
    // Inside a form it must not submit it.
    expect(button).toHaveAttribute("type", "button")

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("hands its element to whoever has to give the focus back to it", () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(
      <LandingFooterAction onClick={() => {}} ref={ref}>
        Cookies
      </LandingFooterAction>,
    )

    expect(ref.current).toBe(screen.getByRole("button", { name: "Cookies" }))
  })

  it("stands in the footer's last column, after the privacy policy, when the screen hands it over", () => {
    render(<LandingFooter termsHref="/termos" privacyHref="/privacidade" year={2026} cookies={<LandingFooterAction onClick={() => {}}>Cookies</LandingFooterAction>} />)

    const company = screen.getByRole("navigation", { name: "Empresa" })
    expect([...company.querySelectorAll("a, button")].map((entry) => entry.textContent)).toEqual(["Perguntas", "Termos de uso", "Privacidade", "Cookies"])
    expect(within(company).getByRole("button", { name: "Cookies" })).toBeInTheDocument()
  })

  it("has no accessibility violations, alone or in the footer", async () => {
    const { container, rerender } = render(<LandingFooterAction onClick={() => {}}>Cookies</LandingFooterAction>)
    await expectNoA11yViolations(container)

    rerender(<LandingFooter termsHref="/termos" privacyHref="/privacidade" year={2026} cookies={<LandingFooterAction onClick={() => {}}>Cookies</LandingFooterAction>} />)
    await expectNoA11yViolations(container)
  })
})
