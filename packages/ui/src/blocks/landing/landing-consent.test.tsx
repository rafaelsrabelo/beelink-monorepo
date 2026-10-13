// Node
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// Libs
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en, ptBR } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LandingConsent, type LandingConsentProps } from "./landing-consent"
import { LandingShell } from "./landing-shell"

function renderNotice(overrides: Partial<LandingConsentProps> = {}) {
  const props = { privacyHref: "/privacidade", onAccept: vi.fn(), onRefuse: vi.fn(), text: ptBR.landing.consent, ...overrides }
  return { ...render(<LandingConsent {...props} />), props }
}

const notice = () => screen.getByRole("region", { name: "Cookies de medição" })

/** BEELINK-319 */
describe("LandingConsent", () => {
  it("is a region named by its heading, saying what a yes shares, on which screens, and that a no changes nothing", () => {
    renderNotice()

    const region = within(notice())
    expect(region.getByText(/A Beelink usa o Google Analytics para medir as visitas a esta página e a criação de contas/)).toBeInTheDocument()
    expect(region.getByText(/Se você aceitar, o Google recebe dados da sua navegação aqui e nas telas de entrar e de criar conta/)).toBeInTheDocument()
    expect(region.getByText(/Se recusar, nada é enviado e o site funciona do mesmo jeito/)).toBeInTheDocument()
    expect(region.getByRole("link", { name: "política de privacidade" })).toHaveAttribute("href", "/privacidade")
  })

  it("offers the two answers, each doing only its own", () => {
    const { props } = renderNotice()

    fireEvent.click(screen.getByRole("button", { name: "Recusar" }))
    expect(props.onRefuse).toHaveBeenCalledTimes(1)
    expect(props.onAccept).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Aceitar" }))
    expect(props.onAccept).toHaveBeenCalledTimes(1)
    expect(props.onRefuse).toHaveBeenCalledTimes(1)
  })

  // No dark pattern: the two buttons are one drawing, refusal comes first, and there is no third way out.
  it("draws refusing exactly as it draws accepting, with nothing ticked and no way to close without answering", () => {
    renderNotice()

    const buttons = screen.getAllByRole("button")
    expect(buttons.map((button) => button.textContent)).toEqual(["Recusar", "Aceitar"])
    expect(buttons[0]!.className).toBe(buttons[1]!.className)
    expect(buttons.every((button) => button.getAttribute("type") === "button")).toBe(true)
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
  })

  it("is no dialog: the page behind it stays the page, and nothing is said to be modal", () => {
    const { container } = renderNotice()

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(container.querySelector("[aria-modal], [inert]")).toBeNull()
  })

  it("is walked through by the keyboard and left again: the link, a no, a yes, and on", async () => {
    const user = userEvent.setup()
    render(
      <>
        <LandingConsent privacyHref="/privacidade" onAccept={() => {}} onRefuse={() => {}} text={ptBR.landing.consent} />
        <a href="/signup">Criar minha loja</a>
      </>,
    )

    await user.tab()
    expect(screen.getByRole("link", { name: "política de privacidade" })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole("button", { name: "Recusar" })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole("button", { name: "Aceitar" })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole("link", { name: "Criar minha loja" })).toHaveFocus()
  })

  it("answers to the keyboard alone", async () => {
    const user = userEvent.setup()
    const { props } = renderNotice()

    await user.tab()
    await user.tab()
    await user.keyboard("{Enter}")
    expect(props.onRefuse).toHaveBeenCalledTimes(1)

    await user.tab()
    await user.keyboard(" ")
    expect(props.onAccept).toHaveBeenCalledTimes(1)
  })

  it("says the answer in force when it is opened again, and none to a visitor who gave none", () => {
    const { rerender, props } = renderNotice()
    expect(screen.queryByText(/Sua escolha atual/)).not.toBeInTheDocument()

    rerender(<LandingConsent {...props} current="granted" />)
    expect(screen.getByText("Sua escolha atual: você aceitou.")).toBeInTheDocument()

    rerender(<LandingConsent {...props} current="denied" />)
    expect(screen.getByText("Sua escolha atual: você recusou.")).toBeInTheDocument()
  })

  it("can be given the focus by script, without being a stop of its own", () => {
    const ref = { current: null as HTMLElement | null }
    renderNotice({ ref })

    expect(ref.current).toBe(notice())
    expect(ref.current).toHaveAttribute("tabindex", "-1")
  })

  /**
   * jsdom lays nothing out, so what is held here is what the layout rests on: the notice sticks to
   * the foot of the screen from the end of the shell's column, while being the first thing in the
   * document. A browser is what saw it stand there.
   */
  it("is written first in the landing's shell and laid last, at the foot of the screen", () => {
    const { container } = render(
      <LandingShell notice={<LandingConsent privacyHref="/privacidade" onAccept={() => {}} onRefuse={() => {}} text={ptBR.landing.consent} />}>
        <main>a página</main>
      </LandingShell>,
    )
    const shell = container.firstElementChild!

    expect(shell.firstElementChild).toBe(notice())
    expect(notice().compareDocumentPosition(screen.getByRole("main")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(shell).toHaveClass("flex", "flex-col")
    expect(notice()).toHaveClass("sticky", "bottom-0", "order-last")
    // Fixed would lay it over the footer at the page's end, with nothing to make room for it.
    expect(notice()).not.toHaveClass("fixed")
  })

  /**
   * The notice stands over the foot of the screen, so a control a keyboard reaches there would be
   * behind it. The document is told how tall the notice is, and to forget it.
   */
  it("tells the document its own height while it stands, and takes it back when it leaves", () => {
    const height = vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(118)
    const { unmount } = renderNotice()

    expect(notice()).toHaveAttribute("data-landing-notice")
    expect(document.documentElement.style.getPropertyValue("--landing-notice-height")).toBe("118px")

    unmount()
    expect(document.documentElement.style.getPropertyValue("--landing-notice-height")).toBe("")
    height.mockRestore()
  })

  /**
   * Its own controls stand in the very room the document keeps clear. With that room kept while
   * the focus was on one of them, a browser scrolled the page to bring it up, at every Tab. jsdom
   * scrolls nothing, so what is held is the rule: the room is the stylesheet's to keep, by the two
   * names the notice writes, and never while the focus is inside the notice. A browser is what saw
   * the page stay still (`apps/web/e2e/site-consent.spec.ts`).
   */
  it("leaves the room at the document's foot to a rule that lets go of it while the focus is inside the notice", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles/globals.css"), "utf8")
    renderNotice()

    // Written on the document from here, the room would be kept whatever holds the focus.
    expect(document.documentElement.style.scrollPaddingBottom).toBe("")
    expect(css).toContain("html:has([data-landing-notice]:not(:focus-within)) {\n  scroll-padding-bottom: var(--landing-notice-height, 0px);\n}")
    expect(css.match(/\[data-landing-notice\]/g)).toHaveLength(1)
    expect(css.match(/--landing-notice-height/g)).toHaveLength(1)
  })

  it("speaks the language it is handed", () => {
    renderNotice({ text: en.landing.consent })

    expect(screen.getByRole("region", { name: "Measurement cookies" })).toBeInTheDocument()
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Refuse", "Accept"])
    expect(screen.getByRole("link", { name: "privacy policy" })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/[{}]/)
  })

  it("has no accessibility violations, asked for the first time or again", async () => {
    const { container, rerender, props } = renderNotice()
    await expectNoA11yViolations(container)

    rerender(<LandingConsent {...props} current="granted" />)
    await expectNoA11yViolations(container)
  })
})
