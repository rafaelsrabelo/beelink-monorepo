// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { OrderRefundForm, type OrderRefundFormProps } from "./order-refund-form"

const base: OrderRefundFormProps = { number: 12, kind: "payment", method: "PIX", paidCents: 15990, refundedCents: 0, refundingCents: 0, refundableCents: 15990, backHref: "/pedido", onSubmit: () => {} }

function setup(over: Partial<OrderRefundFormProps> = {}) {
  const onSubmit = vi.fn()
  render(<OrderRefundForm {...base} onSubmit={onSubmit} {...over} />)
  return { onSubmit, user: userEvent.setup() }
}

describe("OrderRefundForm", () => {
  it("starts from all that is left, and sends the amount in cents with the reason", async () => {
    const { onSubmit, user } = setup()

    expect(screen.getByRole("heading", { name: "Estornar o pagamento do pedido #12" })).toBeInTheDocument()
    expect(screen.getByLabelText("Valor do estorno")).toHaveValue("159,90")
    await user.type(screen.getByLabelText("Motivo"), "  Produto com defeito ")
    await user.click(screen.getByRole("button", { name: /Estornar R\$\s159,90/ }))

    expect(onSubmit).toHaveBeenCalledWith({ amountCents: 15990, reason: "Produto com defeito" })
  })

  it("sends a part of it when the shop types less, and says so on the button", async () => {
    const { onSubmit, user } = setup({ refundedCents: 5000, refundableCents: 10990 })

    expect(screen.getByText("Já estornado")).toBeInTheDocument()
    const amount = screen.getByLabelText("Valor do estorno")
    await user.clear(amount)
    await user.type(amount, "19,90")
    await user.type(screen.getByLabelText("Motivo"), "Frete cobrado a mais")
    await user.click(screen.getByRole("button", { name: /Estornar R\$\s19,90/ }))

    expect(onSubmit).toHaveBeenCalledWith({ amountCents: 1990, reason: "Frete cobrado a mais" })
  })

  it("asks nothing of the API for more than what is left, no amount, an amount with two readings, or no reason", async () => {
    const { onSubmit, user } = setup()
    const amount = screen.getByLabelText("Valor do estorno")

    await user.click(screen.getByRole("button", { name: /Estornar/ }))
    expect(screen.getByText("Escreva o motivo, com pelo menos 3 letras.")).toBeInTheDocument()

    await user.type(screen.getByLabelText("Motivo"), "Defeito")
    await user.clear(amount)
    await user.type(amount, "160,00")
    await user.click(screen.getByRole("button", { name: /Estornar/ }))
    expect(screen.getByText(/O valor passa do disponível para estorno \(R\$\s159,90\)\./)).toBeInTheDocument()
    expect(amount).toHaveAttribute("aria-invalid", "true")

    for (const typed of ["", "0", "1,999", "dez"]) {
      await user.clear(amount)
      if (typed) await user.type(amount, typed)
      await user.click(screen.getByRole("button", { name: /Estornar/ }))
      expect(screen.getByText("Informe o valor do estorno.")).toBeInTheDocument()
    }
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("gives back all that is left with a cancellation, asks only why, and says the order goes only if Asaas takes the refund", async () => {
    const { onSubmit, user } = setup({ kind: "cancel", method: "CREDIT_CARD", refundedCents: 5000, refundableCents: 10990 })

    expect(screen.getByRole("heading", { name: "Cancelar o pedido #12 e estornar o pagamento" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Valor do estorno")).not.toBeInTheDocument()
    expect(screen.getByText(/O pedido só é cancelado se o Asaas aceitar o estorno/)).toBeInTheDocument()
    expect(screen.getByText(/até 10 dias úteis/)).toBeInTheDocument()
    await user.type(screen.getByLabelText("Motivo"), "Sem estoque")
    await user.click(screen.getByRole("button", { name: /Estornar R\$\s109,90 e cancelar o pedido/ }))

    expect(onSubmit).toHaveBeenCalledWith({ amountCents: 10990, reason: "Sem estoque" })
  })

  it("says why Asaas refused, and does not send twice while one is on its way", async () => {
    const { onSubmit, user } = setup({ pending: true, error: "A sua conta Asaas não tem saldo para este estorno." })

    expect(screen.getByRole("alert")).toHaveTextContent("A sua conta Asaas não tem saldo para este estorno.")
    await user.type(screen.getByLabelText("Motivo"), "Defeito")
    await user.click(screen.getByRole("button", { name: "Estornando…" }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("offers nothing when nothing is left to refund, and names a stray payment's refund", () => {
    setup({ kind: "stray", refundableCents: 0 })

    expect(screen.getByRole("heading", { name: "Estornar um pagamento a resolver do pedido #12" })).toBeInTheDocument()
    expect(screen.getByText("Este pedido não tem valor disponível para estorno.")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Voltar ao pedido" })).toHaveAttribute("href", "/pedido")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <OrderRefundForm {...base} error="O Asaas recusou o estorno." />
      </main>,
    )
    await expectNoA11yViolations(container)
  })
})
