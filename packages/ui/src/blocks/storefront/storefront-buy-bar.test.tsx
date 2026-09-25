// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontBuyBar } from "./storefront-buy-bar"

describe("StorefrontBuyBar", () => {
  it("offers the price and one pill while shown", async () => {
    const user = userEvent.setup()
    const onAct = vi.fn()
    render(<StorefrontBuyBar shown price={<span>R$ 119,90</span>} label="Adicionar ao carrinho" onAct={onAct} />)

    await user.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }))

    expect(onAct).toHaveBeenCalled()
    expect(screen.getByText("R$ 119,90")).toBeInTheDocument()
  })

  it("is inert and slid away while hidden, so nothing reaches it", () => {
    const { container } = render(<StorefrontBuyBar shown={false} label="Adicionar ao carrinho" onAct={() => {}} />)

    const bar = container.firstElementChild as HTMLElement
    expect(bar).toHaveAttribute("inert")
    expect(bar).toHaveClass("invisible", "translate-y-full", "shop-lg:hidden")
  })

  it("says 'Adicionado · Ver carrinho' once added, since the box's line is off screen", () => {
    render(<StorefrontBuyBar shown label="Adicionar ao carrinho" onAct={() => {}} added cartHref="/loja/carrinho" />)

    expect(screen.getByRole("link", { name: "Ver carrinho" })).toHaveAttribute("href", "/loja/carrinho")
    expect(screen.getByText(/Adicionado ·/)).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontBuyBar shown price={<span>R$ 119,90</span>} label="Avise-me quando chegar" onAct={() => {}} />)

    await expectNoA11yViolations(container)
  })
})
