// Libs
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { popupPicture } from "./popup.fixtures"
import { StorefrontPopup, type StorefrontPopupProps } from "./storefront-popup"

const words = { title: "Ganhe 5% de desconto na primeira compra", text: "Crie sua conta e o desconto é seu.", action: { label: "Ganhar cupom", href: "/loja/entrar?modo=criar&voltar=%2Floja" } }

function popup(props: Partial<StorefrontPopupProps> = {}) {
  const onOpenChange = vi.fn()
  const view = render(
    <>
      <button type="button">Algo na página</button>
      <StorefrontPopup open onOpenChange={onOpenChange} {...words} {...props} />
    </>,
  )
  return { ...view, onOpenChange }
}

describe("StorefrontPopup", () => {
  it("is a modal dialog named by its title and described by its text", () => {
    popup()

    const dialog = screen.getByRole("dialog", { name: "Ganhe 5% de desconto na primeira compra" })
    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(dialog).toHaveAccessibleDescription("Crie sua conta e o desconto é seu.")
  })

  it("draws nothing while it is closed", () => {
    popup({ open: false })

    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("leads to the shop's sign-up with the way back, and collects nothing", async () => {
    const onAction = vi.fn()
    popup({ onAction })

    const dialog = screen.getByRole("dialog")
    const link = within(dialog).getByRole("link", { name: "Ganhar cupom" })
    expect(link).toHaveAttribute("href", "/loja/entrar?modo=criar&voltar=%2Floja")
    // The reference's form — name, e-mail, phone — is not here: the account is opened at the shop's own sign-up.
    expect(within(dialog).queryByRole("textbox")).toBeNull()
    expect(dialog.querySelector("input, form")).toBeNull()

    link.addEventListener("click", (event) => event.preventDefault())
    await userEvent.click(link)
    expect(onAction).toHaveBeenCalledOnce()
  })

  it("moves the focus in, to the close control and not to the button", async () => {
    popup()

    await waitFor(() => expect(screen.getByRole("button", { name: "Fechar" })).toHaveFocus())
  })

  // jsdom runs no layout, so the primitive's guards catch the focus without handing it on; that it
  // wraps round inside the dialog is seen in a real browser (the plan's browser run). Here: Tab
  // never reaches the page.
  it("never lets Tab reach the page behind it", async () => {
    popup()
    const behind = screen.getByRole("button", { name: "Algo na página", hidden: true })
    const dialog = screen.getByRole("dialog")
    await waitFor(() => expect(screen.getByRole("button", { name: "Fechar" })).toHaveFocus())

    for (let presses = 0; presses < 6; presses += 1) {
      await userEvent.tab(presses % 3 === 2 ? { shift: true } : {})
      const focused = document.activeElement as HTMLElement
      expect(focused).not.toBe(behind)
      // The dialog, one of the primitive's own guards, or nothing at all — never a control of the page.
      expect(dialog.contains(focused) || focused.hasAttribute("data-base-ui-focus-guard") || focused === document.body).toBe(true)
    }
  })

  it("asks to close on Escape and on the close control", async () => {
    const { onOpenChange } = popup()

    await userEvent.keyboard("{Escape}")
    expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.anything())

    await userEvent.click(screen.getByRole("button", { name: "Fechar" }))
    expect(onOpenChange).toHaveBeenCalledTimes(2)
  })

  it("puts the page behind it out of reach", () => {
    popup()

    // Out of the accessibility tree while the dialog is up: only the dialog's own controls answer.
    expect(screen.queryByRole("button", { name: "Algo na página" })).toBeNull()
    expect(screen.getByRole("button", { name: "Algo na página", hidden: true })).toBeInTheDocument()
  })

  it("draws the picture as decoration, and the coloured panel alone without one", () => {
    const { unmount } = popup({ imageUrl: popupPicture })
    const picture = screen.getByRole("dialog").querySelector("img")
    expect(picture).toHaveAttribute("alt", "")
    expect(picture).toHaveAttribute("src", popupPicture)
    unmount()

    popup({ imageUrl: null })
    expect(screen.getByRole("dialog").querySelector("img")).toBeNull()
  })

  it("says the benefit's conditions under the text, when handed any", () => {
    popup({ detail: "Em compras a partir de R$ 50,00." })

    expect(within(screen.getByRole("dialog")).getByText("Em compras a partir de R$ 50,00.")).toBeInTheDocument()
  })

  it("draws its sentences as text: markup typed into one is letters on the page", () => {
    popup({ title: "<img src=x onerror=alert(1)>", text: "<script>alert(1)</script>" })

    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument()
    expect(dialog.querySelector("script")).toBeNull()
    expect(dialog.querySelectorAll("img")).toHaveLength(0)
  })

  it("is fixed over the page, never taller than the screen, and still for whoever asked for no motion", () => {
    popup()

    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveClass("fixed", "max-h-[calc(100dvh-2rem)]", "overflow-y-auto", "motion-reduce:animate-none")
  })

  it("wears the shop's colours through the variables it is handed, and names none itself", () => {
    popup({ style: { "--shop-primary": "var(--color-primary)" } as StorefrontPopupProps["style"] })

    const dialog = screen.getByRole("dialog")
    expect(dialog.style.getPropertyValue("--shop-primary")).toBe("var(--color-primary)")
    expect(dialog.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i)
  })

  it("names its close control in the screen's language", () => {
    popup({ messages: en })

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument()
  })

  it("has no accessibility violations, with and without a picture", async () => {
    const withPicture = popup({ imageUrl: popupPicture, detail: "Em compras a partir de R$ 50,00." })
    await expectNoA11yViolations(document.body)
    withPicture.unmount()

    popup({ imageUrl: null })
    await expectNoA11yViolations(document.body)
  })
})
