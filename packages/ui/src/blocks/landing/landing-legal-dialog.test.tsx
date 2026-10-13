// React
import { useRef, useState } from "react"

// Libs
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en, ptBR } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { sampleLegalDocument } from "../legal/legal-document.fixtures"
import type { LegalDocumentContent } from "../legal/legal-document"
import { LandingLegalDialog } from "./landing-legal-dialog"

const text = ptBR.landing.couriers.form.legal

/** A page with something typed in it and the link that opens the dialog, as the form has them. */
function Page({ content = sampleLegalDocument, failed = false, onRetry }: { content?: LegalDocumentContent | null; failed?: boolean; onRetry?: () => void }) {
  const [open, setOpen] = useState(false)
  const link = useRef<HTMLAnchorElement>(null)

  return (
    <>
      <label>
        Nome completo
        <input defaultValue="" />
      </label>
      <a
        ref={link}
        href="/privacidade"
        onClick={(event) => {
          event.preventDefault()
          setOpen(true)
        }}
      >
        política de privacidade
      </a>
      <LandingLegalDialog open={open} onOpenChange={setOpen} title={text.titles.privacy} content={content} failed={failed} onRetry={onRetry} href="/privacidade" returnFocus={link} text={text} />
    </>
  )
}

async function openDialog(props: Parameters<typeof Page>[0] = {}) {
  const user = userEvent.setup()
  render(<Page {...props} />)
  await user.type(screen.getByLabelText("Nome completo"), "Zuleica Tavares")
  await user.click(screen.getByRole("link", { name: "política de privacidade" }))
  return { user, dialog: await screen.findByRole("dialog") }
}

describe("LandingLegalDialog", () => {
  it("is nowhere in the page until it is opened", () => {
    render(<Page />)

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain("a loja é a controladora")
  })

  it("is a dialog named by the text's title and described by the day it took effect, in the text's own language", async () => {
    const { dialog } = await openDialog()

    expect(dialog).toHaveAccessibleName("Política de privacidade")
    expect(dialog).toHaveAccessibleDescription("Vigente desde 30 de setembro de 2026")
    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(within(dialog).getByRole("heading", { level: 2, name: "Política de privacidade" })).toHaveAttribute("lang", "pt-BR")
  })

  it("draws the text whole, by the legal pages' own block: the title once, its sections a level under it", async () => {
    const { dialog } = await openDialog()

    expect(within(dialog).getAllByRole("heading", { level: 2 })).toHaveLength(1)
    expect(within(dialog).queryByRole("heading", { level: 1 })).not.toBeInTheDocument()
    expect(within(dialog).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["1. Quem cuida dos seus dados", "2. Seus direitos"])
    expect(within(dialog).getByText(/a loja é a controladora/)).toBeInTheDocument()
    expect(within(dialog).getByRole("article")).toHaveAttribute("lang", "pt-BR")
  })

  it.each([
    ["the button", async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Fechar" }))],
    ["Escape", async (user: ReturnType<typeof userEvent.setup>) => user.keyboard("{Escape}")],
  ])("closes by %s, gives the focus back to the link that opened it and leaves what was typed", async (_, close) => {
    const { user } = await openDialog()

    await close(user)

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole("link", { name: "política de privacidade" })).toHaveFocus())
    expect(screen.getByLabelText("Nome completo")).toHaveValue("Zuleica Tavares")
  })

  // The primitive gives the focus back after a press outside only where the browser can focus
  // without scrolling, which jsdom cannot say: that the link gets it is seen in a real browser
  // (`apps/web/e2e/courier-application.spec.ts`).
  it("closes by a press outside, and leaves what was typed", async () => {
    const { user } = await openDialog()

    await user.click(document.querySelector('[data-slot="dialog-overlay"]')!)

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(screen.getByLabelText("Nome completo")).toHaveValue("Zuleica Tavares")
  })

  // jsdom runs no layout, so the primitive's guards catch the focus without handing it on; that it
  // wraps round inside the dialog is seen in a real browser. Here: Tab never reaches the page.
  it("moves the focus in and never lets Tab reach the page behind it, and its scrolling part is a stop of the keyboard's", async () => {
    const { user, dialog } = await openDialog()
    const behind = screen.getByLabelText("Nome completo", { selector: "input" })

    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Fechar" })).toHaveFocus())
    for (let press = 0; press < 6; press += 1) {
      await user.tab(press % 3 === 2 ? { shift: true } : {})
      const focused = document.activeElement as HTMLElement
      expect(focused).not.toBe(behind)
      expect(dialog.contains(focused) || focused.hasAttribute("data-base-ui-focus-guard") || focused === document.body).toBe(true)
    }
    expect(within(dialog).getByRole("article").parentElement).toHaveAttribute("tabindex", "0")
  })

  /** Non-negotiable 3: loading is a skeleton — and the dialog already has its name. */
  it("stands in for a text that has not arrived with lines, never a spinner or a sentence, under the name it was given", async () => {
    const { dialog } = await openDialog({ content: null })

    expect(dialog).toHaveAccessibleName("Política de privacidade")
    expect(dialog).not.toHaveAccessibleDescription()
    expect(dialog.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(3)
    expect(dialog.querySelector("[aria-busy='true']")).not.toBeNull()
    expect(within(dialog).queryByRole("article")).not.toBeInTheDocument()
    expect(dialog.textContent).toBe("Política de privacidade")
  })

  it("says the text did not arrive, asks again when told to and leads to the page in another tab", async () => {
    const retried = vi.fn()
    const { user, dialog } = await openDialog({ content: null, failed: true, onRetry: retried })

    expect(within(dialog).getByRole("alert")).toHaveTextContent("Não foi possível carregar o texto agora.")
    expect(dialog.querySelector('[data-slot="skeleton"]')).toBeNull()
    expect(dialog.querySelector("[aria-busy]")).toBeNull()
    const page = within(dialog).getByRole("link", { name: "Abrir numa nova aba" })
    expect(page).toHaveAttribute("href", "/privacidade")
    expect(page).toHaveAttribute("target", "_blank")

    await user.click(within(dialog).getByRole("button", { name: "Tentar de novo" }))

    expect(retried).toHaveBeenCalledTimes(1)
  })

  /** The text binds in Portuguese: around it, only the dialog's own controls follow the page's language. */
  it("keeps the text's own title and day in the text's language on a page read in another", async () => {
    const user = userEvent.setup()
    const english = en.landing.couriers.form.legal
    function EnglishPage() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            open
          </button>
          <LandingLegalDialog open={open} onOpenChange={setOpen} title={english.titles.privacy} content={sampleLegalDocument} href="/privacidade" text={english} />
        </>
      )
    }
    render(<EnglishPage />)

    await user.click(screen.getByRole("button", { name: "open" }))

    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveAccessibleName("Política de privacidade")
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeInTheDocument()
  })

  it("has no accessibility violations: with the text, waiting for it, and without it", async () => {
    for (const props of [{}, { content: null }, { content: null, failed: true }]) {
      const { unmount } = render(<Page {...props} />)
      await userEvent.click(screen.getByRole("link", { name: "política de privacidade" }))
      await screen.findByRole("dialog")

      await expectNoA11yViolations(document.body)
      unmount()
    }
  })
})
