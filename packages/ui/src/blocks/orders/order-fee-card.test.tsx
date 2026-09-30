// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { OrderFeeCard } from "./order-fee-card"

describe("OrderFeeCard", () => {
  it("sends the fee typed in reais as cents, and says how it reaches the customer while none is agreed", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<OrderFeeCard feeCents={null} onSave={onSave} />)

    expect(screen.getByText(/o total e o pedido dele se atualizam/)).toBeInTheDocument()
    await user.type(screen.getByLabelText("Valor do frete (R$)"), "12,50")
    await user.click(screen.getByRole("button", { name: "Salvar frete" }))

    expect(onSave).toHaveBeenCalledWith(1250)
  })

  it("starts from the fee agreed, and takes zero as a free delivery", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<OrderFeeCard feeCents={800} onSave={onSave} />)

    const field = screen.getByLabelText("Valor do frete (R$)")
    expect(field).toHaveValue("8,00")
    await user.clear(field)
    await user.type(field, "0")
    await user.click(screen.getByRole("button", { name: "Salvar frete" }))

    expect(onSave).toHaveBeenCalledWith(0)
  })

  it("says what it cannot read instead of guessing, and sends nothing", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<OrderFeeCard feeCents={null} onSave={onSave} />)

    await user.click(screen.getByRole("button", { name: "Salvar frete" }))

    expect(screen.getByRole("alert")).toHaveTextContent("Digite um valor em reais")
    expect(onSave).not.toHaveBeenCalled()
  })

  it("tells a save went through, and a refusal in words", () => {
    const { rerender } = render(<OrderFeeCard feeCents={1250} onSave={() => {}} saved />)
    expect(screen.getByText("Frete salvo.")).toBeInTheDocument()

    rerender(<OrderFeeCard feeCents={1250} onSave={() => {}} error="Esse pedido foi cancelado e não muda mais." />)
    expect(screen.getByRole("alert")).toHaveTextContent("cancelado")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <OrderFeeCard feeCents={null} onSave={() => {}} />
      </main>,
    )
    await expectNoA11yViolations(container)
  })
})
