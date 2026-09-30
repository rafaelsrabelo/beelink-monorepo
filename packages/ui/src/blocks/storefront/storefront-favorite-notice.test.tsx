// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFavoriteNotice } from "./storefront-favorite-notice"

describe("StorefrontFavoriteNotice", () => {
  it("keeps an empty region in the page, so the sentence is heard when it arrives", () => {
    render(<StorefrontFavoriteNotice message={null} onClose={() => {}} />)
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  it("says what failed, points where it can be fixed, and closes", async () => {
    const onClose = vi.fn()
    render(<StorefrontFavoriteNotice message="Você já tem 200 favoritos." link={{ href: "/loja/conta/favoritos", label: "Ver favoritos" }} onClose={onClose} />)

    expect(screen.getByRole("status")).toHaveTextContent("Você já tem 200 favoritos. Ver favoritos")
    expect(screen.getByRole("link", { name: "Ver favoritos" })).toHaveAttribute("href", "/loja/conta/favoritos")
    await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontFavoriteNotice message="Não deu para salvar." onClose={() => {}} />)
    await expectNoA11yViolations(container)
  })
})
