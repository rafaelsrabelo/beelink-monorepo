// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { OrderPaymentCard } from "./order-payment-card"
import { paidAfterCancelled, paidCard, paidPix, paidTwice, pendingPix, refused } from "./order-payment.fixtures"

const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
const when = (iso: string) => `em ${iso.slice(0, 16)}`
const props = { money, when }

describe("OrderPaymentCard", () => {
  it("says a charge still to be paid waits, how it is paid, how much, and until when", () => {
    render(<OrderPaymentCard payment={pendingPix} {...props} />)

    const card = screen.getByRole("region", { name: "Pagamento online" })
    expect(within(card).getByText("Aguardando pagamento")).toBeInTheDocument()
    expect(within(card).getByText("Pix")).toBeInTheDocument()
    expect(within(card).getByText("R$ 159,90")).toBeInTheDocument()
    expect(within(card).getByText("Vence em")).toBeInTheDocument()
    expect(within(card).queryByText("Pago em")).not.toBeInTheDocument()
    expect(within(card).queryByText("Pagamento a resolver")).not.toBeInTheDocument()
  })

  it("says there is no charge yet on an order nobody made one for", () => {
    render(<OrderPaymentCard payment={null} {...props} />)

    expect(screen.getByText("O cliente ainda não gerou a cobrança deste pedido.")).toBeInTheDocument()
  })

  it("says a Pix was paid, when, and that the money is in the account", () => {
    render(<OrderPaymentCard payment={paidPix} {...props} />)

    expect(screen.getByText("Pago")).toBeInTheDocument()
    expect(screen.getByText("em 2026-10-06T13:02")).toBeInTheDocument()
    expect(screen.getByText("O valor já está na sua conta Asaas.")).toBeInTheDocument()
    expect(screen.queryByText("Vence em")).not.toBeInTheDocument()
  })

  it("says a card's instalments, and that its money is still held", () => {
    render(<OrderPaymentCard payment={paidCard} {...props} />)

    expect(screen.getByText("Cartão de crédito · 3x sem juros")).toBeInTheDocument()
    expect(screen.getByText(/O Asaas libera o valor na sua conta depois do prazo do cartão/)).toBeInTheDocument()
  })

  it("says a card in full, and Asaas's own word where it says more than ours", () => {
    render(<OrderPaymentCard payment={{ ...pendingPix, method: "CREDIT_CARD", providerStatus: "AWAITING_RISK_ANALYSIS" }} {...props} />)

    expect(screen.getByText("Cartão de crédito · À vista")).toBeInTheDocument()
    expect(screen.getByText("O Asaas está analisando o cartão.")).toBeInTheDocument()
  })

  it("says what Asaas last refused, in its words", () => {
    render(<OrderPaymentCard payment={refused} {...props} />)

    expect(screen.getByText("Cobrança recusada")).toBeInTheDocument()
    expect(screen.getByText("Última recusa do Asaas")).toBeInTheDocument()
    expect(screen.getByText("O CPF ou CNPJ informado é inválido.")).toBeInTheDocument()
  })

  it("draws money paid after the order was cancelled, with what the shop does about it", () => {
    render(<OrderPaymentCard payment={paidAfterCancelled} {...props} />)

    const stray = screen.getByRole("group", { name: "Pagamento a resolver" })
    expect(within(stray).getByText("Este pedido foi pago depois de cancelado.")).toBeInTheDocument()
    expect(within(stray).getByText("R$ 159,90 no Pix, em em 2026-10-06T13:02")).toBeInTheDocument()
    expect(within(stray).getByText(/estorne ao cliente pelo painel do Asaas/)).toBeInTheDocument()
  })

  it("draws a second payment of an order already paid", () => {
    render(<OrderPaymentCard payment={paidTwice} {...props} />)

    expect(within(screen.getByRole("group", { name: "Pagamento a resolver" })).getByText("Este pedido foi pago duas vezes.")).toBeInTheDocument()
  })

  it("says overdue, cancelled and refunded in words", () => {
    const { rerender } = render(<OrderPaymentCard payment={{ ...pendingPix, status: "OVERDUE" }} {...props} />)
    expect(screen.getByText("Vencido")).toBeInTheDocument()

    rerender(<OrderPaymentCard payment={{ ...pendingPix, status: "CANCELLED" }} {...props} />)
    expect(screen.getByText("Cobrança cancelada")).toBeInTheDocument()
    expect(screen.queryByText("Vence em")).not.toBeInTheDocument()

    rerender(<OrderPaymentCard payment={{ ...paidPix, status: "REFUNDED" }} {...props} />)
    expect(screen.getByText("Estornado")).toBeInTheDocument()

    rerender(<OrderPaymentCard payment={{ ...paidPix, status: "PARTIALLY_REFUNDED" }} {...props} />)
    expect(screen.getByText("Estornado em parte")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <OrderPaymentCard payment={paidAfterCancelled} {...props} />
      </main>,
    )
    await expectNoA11yViolations(container)
  })
})
