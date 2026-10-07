// Libs
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontConsent, type StorefrontConsentProps } from "./storefront-consent"

function renderStrip(overrides: Partial<StorefrontConsentProps> = {}) {
  const props = { privacyHref: "/privacidade", onAccept: vi.fn(), onRefuse: vi.fn(), ...overrides }
  return { ...render(<StorefrontConsent {...props} />), props }
}

/** BEELINK-271 */
describe("StorefrontConsent", () => {
  it("is a region named by its heading, saying what a yes shares and that a no changes nothing", () => {
    renderStrip()

    const strip = within(screen.getByRole("region", { name: "Cookies de anúncios" }))
    expect(strip.getByText(/Esta loja usa o Pixel da Meta para medir os anúncios dela/)).toBeInTheDocument()
    expect(strip.getByText(/Se você aceitar, a Meta recebe dados da sua navegação nesta loja/)).toBeInTheDocument()
    expect(strip.getByText(/Se recusar, nada é enviado e a loja funciona do mesmo jeito/)).toBeInTheDocument()
    expect(strip.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", "/privacidade")
  })

  it("offers the two answers, each doing only its own", () => {
    const { props } = renderStrip()

    fireEvent.click(screen.getByRole("button", { name: "Recusar" }))
    expect(props.onRefuse).toHaveBeenCalledTimes(1)
    expect(props.onAccept).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Aceitar" }))
    expect(props.onAccept).toHaveBeenCalledTimes(1)
    expect(props.onRefuse).toHaveBeenCalledTimes(1)
  })

  // No dark pattern: the two buttons are one drawing, refusal comes first, and there is no third way out.
  it("draws refusing exactly as it draws accepting, and nothing else to press", () => {
    renderStrip()

    const buttons = screen.getAllByRole("button")
    expect(buttons.map((button) => button.textContent)).toEqual(["Recusar", "Aceitar"])
    expect(buttons[0]!.className).toBe(buttons[1]!.className)
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
  })

  it("is walked through by the keyboard and left again: the link, a no, a yes, and on", async () => {
    const user = userEvent.setup()
    render(
      <>
        <StorefrontConsent privacyHref="/privacidade" onAccept={() => {}} onRefuse={() => {}} />
        <a href="/loja">A loja</a>
      </>,
    )

    await user.tab()
    expect(screen.getByRole("link", { name: "Política de privacidade" })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole("button", { name: "Recusar" })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole("button", { name: "Aceitar" })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole("link", { name: "A loja" })).toHaveFocus()
  })

  it("says the answer in force when it is opened again, and none to a visitor who gave none", () => {
    const { rerender, props } = renderStrip()
    expect(screen.queryByText(/Sua escolha atual/)).not.toBeInTheDocument()

    rerender(<StorefrontConsent {...props} current="granted" />)
    expect(screen.getByText("Sua escolha atual: você aceitou.")).toBeInTheDocument()

    rerender(<StorefrontConsent {...props} current="denied" />)
    expect(screen.getByText("Sua escolha atual: você recusou.")).toBeInTheDocument()
  })

  it("can be given the focus by script, without being a stop of its own", () => {
    const ref = { current: null as HTMLElement | null }
    renderStrip({ ref })

    expect(ref.current).toBe(screen.getByRole("region", { name: "Cookies de anúncios" }))
    expect(ref.current).toHaveAttribute("tabindex", "-1")
  })

  it("speaks the language it is handed", () => {
    renderStrip({ messages: en })

    expect(screen.getByRole("region", { name: "Advertising cookies" })).toBeInTheDocument()
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Refuse", "Accept"])
    expect(screen.getByRole("link", { name: "Privacy policy" })).toBeInTheDocument()
  })

  it("has no accessibility violations, asked for the first time or again", async () => {
    const { container, rerender, props } = renderStrip()
    await expectNoA11yViolations(container)

    rerender(<StorefrontConsent {...props} current="granted" />)
    await expectNoA11yViolations(container)
  })
})
