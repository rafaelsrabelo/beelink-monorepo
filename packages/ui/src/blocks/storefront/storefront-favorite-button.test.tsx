// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFavoriteButton } from "./storefront-favorite-button"

describe("StorefrontFavoriteButton", () => {
  it("is a toggle named after the product, pressed once liked", async () => {
    const onToggle = vi.fn()
    const { rerender } = render(<StorefrontFavoriteButton name="Whey" liked={false} onToggle={onToggle} />)

    const heart = screen.getByRole("button", { name: "Curtir Whey" })
    expect(heart).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(heart)
    expect(onToggle).toHaveBeenCalledOnce()

    rerender(<StorefrontFavoriteButton name="Whey" liked onToggle={onToggle} />)
    expect(screen.getByRole("button", { name: "Curtir Whey" })).toHaveAttribute("aria-pressed", "true")
  })

  it("is a link to sign in for a visitor, and says why", () => {
    render(<StorefrontFavoriteButton name="Whey" liked={false} signInHref="/loja/entrar?voltar=%2Floja%3Fcurtir%3Dp" />)

    expect(screen.getByRole("link", { name: "Entre para curtir Whey" })).toHaveAttribute("href", "/loja/entrar?voltar=%2Floja%3Fcurtir%3Dp")
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("says it in words in the buy box, and cannot be pressed while the likes are read", () => {
    const { rerender } = render(<StorefrontFavoriteButton name="Whey" liked={false} look="text" disabled onToggle={() => {}} />)
    expect(screen.getByRole("button", { name: "Adicionar aos favoritos" })).toBeDisabled()

    // The words say the state, so it is not said again as pressed.
    rerender(<StorefrontFavoriteButton name="Whey" liked look="text" onToggle={() => {}} />)
    expect(screen.getByRole("button", { name: "Nos seus favoritos" })).not.toHaveAttribute("aria-pressed")
  })

  it("has no accessibility violations", async () => {
    const { container, rerender } = render(<StorefrontFavoriteButton name="Whey" liked onToggle={() => {}} />)
    await expectNoA11yViolations(container)

    rerender(<StorefrontFavoriteButton name="Whey" liked={false} look="text" signInHref="#" />)
    await expectNoA11yViolations(container)
  })
})
