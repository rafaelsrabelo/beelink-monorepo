// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { OrderPaymentCard } from "./order-payment-card"
import { paidAfterCancelled, paidCard, paidPix, paidTwice, partlyRefunded, pendingPix, refundedWhole, refundingCard, refundRefused, refused, strayResolved } from "./order-payment.fixtures"

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
    expect(within(stray).getByText(/estorne ao cliente por aqui/)).toBeInTheDocument()
    // With nowhere to ask it, the card only tells.
    expect(within(stray).queryByRole("link")).not.toBeInTheDocument()
  })

  it("leads to the refund of money the order did not ask for, and stops telling of it once it was given back", () => {
    const { rerender } = render(<OrderPaymentCard payment={paidTwice} strayRefundHref={(id) => `/refund?stray=${id}`} {...props} />)
    expect(within(screen.getByRole("group", { name: "Pagamento a resolver" })).getByRole("link", { name: "Estornar R$ 159,90" })).toHaveAttribute("href", "/refund?stray=stray-2")

    rerender(<OrderPaymentCard payment={strayResolved} strayRefundHref={(id) => `/refund?stray=${id}`} {...props} />)
    expect(screen.queryByRole("group", { name: "Pagamento a resolver" })).not.toBeInTheDocument()
    expect(within(screen.getByRole("group", { name: "Estornos" })).getByText(/De um pagamento a resolver/)).toBeInTheDocument()
  })

  it("offers one way to give back a payment made after the order was cancelled: its notice's", () => {
    render(<OrderPaymentCard payment={paidAfterCancelled} refundHref="/refund" strayRefundHref={(id) => `/refund?stray=${id}`} {...props} />)

    expect(screen.getAllByRole("link")).toHaveLength(1)
    expect(screen.getByRole("link", { name: "Estornar R$ 159,90" })).toHaveAttribute("href", "/refund?stray=stray-1")
  })

  it("offers the refund while the shop holds money, and not on a charge nobody paid or all given back", () => {
    const { rerender } = render(<OrderPaymentCard payment={paidPix} refundHref="/refund" {...props} />)
    expect(screen.getByRole("link", { name: "Estornar pagamento" })).toHaveAttribute("href", "/refund")

    rerender(<OrderPaymentCard payment={pendingPix} refundHref="/refund" {...props} />)
    expect(screen.queryByRole("link", { name: "Estornar pagamento" })).not.toBeInTheDocument()
    rerender(<OrderPaymentCard payment={refundedWhole} refundHref="/refund" {...props} />)
    expect(screen.queryByRole("link", { name: "Estornar pagamento" })).not.toBeInTheDocument()
    rerender(<OrderPaymentCard payment={paidPix} {...props} />)
    expect(screen.queryByRole("link", { name: "Estornar pagamento" })).not.toBeInTheDocument()
  })

  it("says what went back and what is left, and each refund with its reason", () => {
    render(<OrderPaymentCard payment={partlyRefunded} refundHref="/refund" {...props} />)

    const card = screen.getByRole("region", { name: "Pagamento online" })
    expect(within(card).getByText("Estornado em parte")).toBeInTheDocument()
    expect(within(card).getByText("Disponível para estorno")).toBeInTheDocument()
    expect(within(card).getByText("R$ 109,90")).toBeInTheDocument()
    const refunds = within(card).getByRole("group", { name: "Estornos" })
    expect(within(refunds).getByText("R$ 50,00")).toBeInTheDocument()
    expect(within(refunds).getByText("Concluído")).toBeInTheDocument()
    expect(within(refunds).getByText("Produto com defeito")).toBeInTheDocument()
    expect(within(refunds).getByText(/Pelo pedido/)).toBeInTheDocument()
  })

  it("says a card's refund is in progress until Asaas concludes it, and offers no second one", () => {
    render(<OrderPaymentCard payment={refundingCard} refundHref="/refund" {...props} />)

    expect(screen.getByText(/Estorno em processamento no Asaas/)).toBeInTheDocument()
    const refunds = screen.getByRole("group", { name: "Estornos" })
    expect(within(refunds).getByText("Em processamento")).toBeInTheDocument()
    expect(within(refunds).getByText(/No cancelamento do pedido/)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Estornar pagamento" })).not.toBeInTheDocument()
  })

  it("says a refund made at Asaas itself, one Asaas refused in its words, and one it never answered", () => {
    const { rerender } = render(<OrderPaymentCard payment={refundedWhole} {...props} />)
    expect(screen.getByText(/Feito no painel do Asaas/)).toBeInTheDocument()

    rerender(<OrderPaymentCard payment={refundRefused} {...props} />)
    expect(screen.getByText("Não realizado")).toBeInTheDocument()
    expect(screen.getByText("Saldo insuficiente para realizar o estorno.")).toBeInTheDocument()
    expect(screen.getByText("Sem confirmação do Asaas")).toBeInTheDocument()
    expect(screen.getByText(/o bee-link confere a cobrança no Asaas/)).toBeInTheDocument()
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
        <OrderPaymentCard payment={paidAfterCancelled} refundHref="/refund" strayRefundHref={(id) => `/refund?stray=${id}`} {...props} />
      </main>,
    )
    await expectNoA11yViolations(container)
  })

  it("has no accessibility violations with refunds on it", async () => {
    const { container } = render(
      <main>
        <OrderPaymentCard payment={refundRefused} refundHref="/refund" {...props} />
      </main>,
    )
    await expectNoA11yViolations(container)
  })
})
