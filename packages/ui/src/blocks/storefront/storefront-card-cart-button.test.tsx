// Libs
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCardCartButton } from "./storefront-card-cart-button"

afterEach(() => {
  vi.useRealTimers()
})

describe("StorefrontCardCartButton", () => {
  it("adds a product without options, says so for a moment, and tells a reader", () => {
    vi.useFakeTimers()
    const onAdd = vi.fn()
    render(<StorefrontCardCartButton name="Blusa" hasOptions={false} onAdd={onAdd} />)

    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }))

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Adicionado" })).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Blusa foi adicionado ao carrinho.")

    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByRole("button", { name: "Adicionar ao carrinho" })).toBeInTheDocument()
  })

  it("is no control at all for a product with options — or one not known not to have them", () => {
    const { container, rerender } = render(<StorefrontCardCartButton name="Whey" hasOptions onAdd={() => {}} />)

    expect(screen.queryByRole("button")).toBeNull()
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    expect(container.firstElementChild).toHaveClass("pointer-events-none")
    expect(container).toHaveTextContent("Ver opções")

    rerender(<StorefrontCardCartButton name="Whey" onAdd={() => {}} />)
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCardCartButton name="Blusa" hasOptions={false} onAdd={() => {}} />)

    await expectNoA11yViolations(container)
  })
})
