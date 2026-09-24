// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontBuyActions } from "./storefront-buy-actions"

describe("StorefrontBuyActions", () => {
  it("adds the quantity chosen, and then offers the way to the cart", () => {
    const onAdd = vi.fn()
    render(<StorefrontBuyActions name="Whey" onAdd={onAdd} cartHref="/loja/carrinho" />)

    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Whey" }))
    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Whey" }))
    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }))

    expect(onAdd).toHaveBeenCalledWith(3)
    expect(screen.getByRole("status")).toHaveTextContent("Whey foi adicionado ao carrinho.")
    expect(screen.getByRole("link", { name: "Ver carrinho" })).toHaveAttribute("href", "/loja/carrinho")
  })

  it("buys now by adding on the way to the cart — once, if it was just added", () => {
    const onAdd = vi.fn()
    render(<StorefrontBuyActions name="Whey" onAdd={onAdd} cartHref="/loja/carrinho" />)

    const buyNow = screen.getByRole("link", { name: "Comprar agora" })
    expect(buyNow).toHaveAttribute("href", "/loja/carrinho")
    fireEvent.click(buyNow)
    expect(onAdd).toHaveBeenCalledWith(1)

    onAdd.mockClear()
    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }))
    fireEvent.click(buyNow)
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it("keeps the WhatsApp order below, when the shop has one", () => {
    render(<StorefrontBuyActions name="Whey" onAdd={() => {}} cartHref="#" orderHref="https://wa.me/5511999998888" />)

    expect(screen.getByRole("link", { name: /Pedir/ })).toHaveAttribute("href", "https://wa.me/5511999998888")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontBuyActions name="Whey" onAdd={() => {}} cartHref="#" orderHref="https://wa.me/1" />)

    await expectNoA11yViolations(container)
  })
})
