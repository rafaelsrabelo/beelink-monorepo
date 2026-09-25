// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontBuyActions, type StorefrontBuyActionsProps } from "./storefront-buy-actions"

function renderActions(over: Partial<StorefrontBuyActionsProps> = {}) {
  const props = { name: "100% Whey", qty: 1, onQtyChange: vi.fn(), added: false, onAdd: vi.fn(), cartHref: "/loja/carrinho", ...over }
  render(<StorefrontBuyActions {...props} />)
  return props
}

describe("StorefrontBuyActions", () => {
  it("offers 1 to 10 in the phone's own picker, and reports the one chosen", async () => {
    const user = userEvent.setup()
    const { onQtyChange } = renderActions()

    const quantity = screen.getByRole("combobox", { name: "Quantidade" })
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])
    await user.selectOptions(quantity, "4")

    expect(onQtyChange).toHaveBeenCalledWith(4)
  })

  // A line the cart page raised past 10 still shows what it holds.
  it("keeps a quantity above 10 choosable", () => {
    renderActions({ qty: 12 })

    expect(screen.getByRole("combobox", { name: "Quantidade" })).toHaveValue("12")
  })

  it("adds with 'Adicionar ao carrinho', and 'Comprar agora' adds only when nothing was added yet", async () => {
    const user = userEvent.setup()
    const { onAdd } = renderActions({ added: true })

    const buyNow = screen.getByRole("link", { name: "Comprar agora" })
    buyNow.addEventListener("click", (event) => event.preventDefault())
    await user.click(buyNow)
    expect(onAdd).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it("says it was added, with the way to the cart", () => {
    renderActions({ added: true })

    expect(screen.getByRole("status")).toHaveTextContent("100% Whey foi adicionado ao carrinho.")
    expect(screen.getByRole("link", { name: "Ver carrinho" })).toHaveAttribute("href", "/loja/carrinho")
  })

  it("no longer offers the WhatsApp order beside the cart", () => {
    renderActions()

    expect(screen.queryByRole("link", { name: /WhatsApp/ })).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontBuyActions name="Whey" qty={1} onQtyChange={() => {}} added onAdd={() => {}} cartHref="#" />)

    await expectNoA11yViolations(container)
  })
})
