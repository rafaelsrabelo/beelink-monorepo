// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCashbackUse } from "./storefront-cashback-use"

describe("StorefrontCashbackUse", () => {
  it("offers what the shopper has, and says the choice when it is pressed", () => {
    const onCheckedChange = vi.fn()
    render(<StorefrontCashbackUse balance="R$ 15,00" checked={false} onCheckedChange={onCheckedChange} />)

    const box = screen.getByRole("checkbox", { name: "Usar meu cashback (R$ 15,00 disponíveis)" })
    expect(box).not.toBeChecked()
    fireEvent.click(box)

    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it("says the most the cart takes once ticked, when it is less than the balance", () => {
    const { rerender } = render(<StorefrontCashbackUse balance="R$ 80,00" checked={false} cappedAt="R$ 50,00" />)
    expect(screen.queryByText(/aceita até/)).toBeNull()

    rerender(<StorefrontCashbackUse balance="R$ 80,00" checked cappedAt="R$ 50,00" />)

    expect(screen.getByRole("checkbox")).toBeChecked()
    expect(screen.getByRole("checkbox")).toHaveAccessibleDescription("Este pedido aceita até R$ 50,00 de cashback. O resto continua no seu saldo.")
  })

  it("is off, and says why, when the cart has nothing credit may pay for", () => {
    render(<StorefrontCashbackUse balance="R$ 15,00" checked nothingToPay />)

    expect(screen.getByRole("checkbox")).toBeDisabled()
    expect(screen.getByRole("checkbox")).not.toBeChecked()
    expect(screen.getByText("Não sobra valor de produtos neste pedido para pagar com cashback.")).toBeInTheDocument()
  })

  it("has no a11y violations", async () => {
    const { container } = render(<StorefrontCashbackUse balance="R$ 80,00" checked cappedAt="R$ 50,00" />)

    await expectNoA11yViolations(container)
  })
})
