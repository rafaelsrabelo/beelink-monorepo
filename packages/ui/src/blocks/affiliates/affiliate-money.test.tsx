// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AffiliateAdjustmentDialog } from "./affiliate-adjustment-dialog"
import { AffiliateBalanceCard } from "./affiliate-balance-card"
import { AffiliateFilterChip } from "./affiliate-filter-chip"
import { adjustmentValue, affiliateOptions, balance, creditedOrder, owed, payoutValue, settledOrder, shortBalance, showcase, statementRows, uncreditedOrder } from "./affiliate-money.fixtures"
import { AffiliateOwedView } from "./affiliate-owed-view"
import { AffiliatePayoutDialog } from "./affiliate-payout-dialog"
import { AffiliateShowcaseCard } from "./affiliate-showcase-card"
import { AffiliateStatement } from "./affiliate-statement"
import { OrderAffiliateCard } from "./order-affiliate-card"
import { OrderAffiliateDialog } from "./order-affiliate-dialog"
import { OrderAffiliateField } from "./order-affiliate-field"

const noop = () => {}

describe("an order's affiliate (IMPULSEIA-107)", () => {
  it("says whom it is credited to, the commission and where it stands, money given back and each change", async () => {
    const onChange = vi.fn()
    const { container } = render(<OrderAffiliateCard view={creditedOrder} onChange={onChange} />)

    const card = within(screen.getByRole("region", { name: "Afiliado" }))
    expect(card.getByRole("link", { name: "Abrir a ficha de João Silva" })).toHaveAttribute("href", "/afiliados/a-joao")
    expect(card.getByText("R$ 22,50")).toBeInTheDocument()
    expect(card.getByText("Vence em 30 de nov.")).toBeInTheDocument()
    expect(card.getByRole("note")).toHaveTextContent("R$ 30,00 deste pedido foram estornados")
    expect(card.getByText("De Maria Souza para João Silva")).toBeInTheDocument()
    await userEvent.click(card.getByRole("button", { name: "Trocar afiliado" }))
    expect(onChange).toHaveBeenCalled()
    await expectNoA11yViolations(container)
  })

  it("offers no change once the commission was released, and says how to correct it", () => {
    render(<OrderAffiliateCard view={settledOrder} onChange={noop} />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.getByText(/faça um ajuste no extrato/)).toBeInTheDocument()
  })

  it("says it is credited to nobody, and offers to credit it", () => {
    render(<OrderAffiliateCard view={uncreditedOrder} onChange={noop} />)

    expect(screen.getByText("Nenhum afiliado neste pedido.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Atribuir a um afiliado" })).toBeInTheDocument()
  })

  it("asks for the affiliate — or nobody — and the reason", async () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    render(<OrderAffiliateDialog open onOpenChange={noop} value={{ affiliateId: "a-joao", reason: "" }} onChange={onChange} onSubmit={onSubmit} options={affiliateOptions} issues={{ reason: "Escreva o motivo." }} error="Não deu." />)

    const dialog = within(screen.getByRole("dialog", { name: "Afiliado do pedido" }))
    expect(dialog.getByText("Escreva o motivo.")).toBeInTheDocument()
    expect(dialog.getByText("Não deu.")).toBeInTheDocument()
    await userEvent.type(dialog.getByLabelText("Motivo"), "x")
    expect(onChange).toHaveBeenLastCalledWith({ affiliateId: "a-joao", reason: "x" })
    await userEvent.click(dialog.getByRole("button", { name: "Salvar" }))
    expect(onSubmit).toHaveBeenCalled()
    await expectNoA11yViolations(document.body)
  })

  it("lets a sale registered in the panel name its affiliate", async () => {
    const { container } = render(<OrderAffiliateField options={affiliateOptions} value="" onChange={noop} />)

    expect(screen.getByRole("region", { name: "Afiliado" })).toBeInTheDocument()
    expect(screen.getByText(/A comissão é calculada na tabela do afiliado/)).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("names the affiliate the orders list is kept to, and the way back to all", async () => {
    const { container } = render(<AffiliateFilterChip name="Maria Souza" clearHref="/pedidos" />)

    expect(screen.getByText("Pedidos de Maria Souza")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver todos os pedidos" })).toHaveAttribute("href", "/pedidos")
    await expectNoA11yViolations(container)
  })
})

describe("an affiliate's money (IMPULSEIA-107)", () => {
  it("shows the balances, the statement and the ways to pay and adjust", async () => {
    const onPay = vi.fn()
    const onAdjust = vi.fn()
    const onPage = vi.fn()
    const { container } = render(
      <AffiliateBalanceCard balance={balance} ordersHref="/pedidos?affiliate=a-joao" onPay={onPay} onAdjust={onAdjust}>
        <AffiliateStatement rows={statementRows} page={1} pageSize={3} total={7} onPage={onPage} />
      </AffiliateBalanceCard>,
    )

    expect(screen.getByText("R$ 210,00")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver os pedidos deste afiliado" })).toHaveAttribute("href", "/pedidos?affiliate=a-joao")
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Pagamento")
    expect(screen.getByText("1–3 de 7")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Mais antigos" }))
    expect(onPage).toHaveBeenCalledWith(2)
    await userEvent.click(screen.getByRole("button", { name: "Registrar pagamento" }))
    await userEvent.click(screen.getByRole("button", { name: "Ajustar saldo" }))
    expect(onPay).toHaveBeenCalled()
    expect(onAdjust).toHaveBeenCalled()
    await expectNoA11yViolations(container)
  })

  it("offers no payout on a balance below zero, and says what the next one is short by", () => {
    render(<AffiliateBalanceCard balance={shortBalance} ordersHref="#" onPay={noop} onAdjust={noop} />)

    expect(screen.getByRole("button", { name: "Registrar pagamento" })).toBeDisabled()
    expect(screen.getByText(/o próximo pagamento desconta R\$ 15,00/)).toBeInTheDocument()
  })

  it("adjusts either way, with the reason", async () => {
    const onChange = vi.fn()
    render(<AffiliateAdjustmentDialog open onOpenChange={noop} value={adjustmentValue} onChange={onChange} onSubmit={noop} issues={{ amount: "Informe um valor maior que zero." }} />)

    const dialog = within(screen.getByRole("dialog", { name: "Ajustar saldo" }))
    expect(dialog.getByRole("radio", { name: "Descontar" })).toBeChecked()
    await userEvent.click(dialog.getByRole("radio", { name: "Acrescentar" }))
    expect(onChange).toHaveBeenLastCalledWith({ ...adjustmentValue, direction: "credit" })
    expect(dialog.getByText("Informe um valor maior que zero.")).toBeInTheDocument()
    await expectNoA11yViolations(document.body)
  })

  it("records a payout made outside, with what is available and the Pix key at hand", async () => {
    const onSubmit = vi.fn()
    render(<AffiliatePayoutDialog open onOpenChange={noop} value={payoutValue} onChange={noop} onSubmit={onSubmit} available="R$ 210,00" maxDay="2026-11-20" pixKey="joao@pix.com" />)

    const dialog = within(screen.getByRole("dialog", { name: "Registrar pagamento" }))
    expect(dialog.getByText("Chave Pix do afiliado: joao@pix.com")).toBeInTheDocument()
    expect(dialog.getByText("Disponível: R$ 210,00.")).toBeInTheDocument()
    expect(dialog.getByLabelText("Pago em")).toHaveAttribute("max", "2026-11-20")
    await userEvent.click(dialog.getByRole("button", { name: "Registrar" }))
    expect(onSubmit).toHaveBeenCalled()
    await expectNoA11yViolations(document.body)
  })

  it("lets the shop take the photo and the phrase off its window", async () => {
    const onRemovePhoto = vi.fn()
    const onRemoveTagline = vi.fn()
    const { container } = render(<AffiliateShowcaseCard showcase={showcase} onRemovePhoto={onRemovePhoto} onRemoveTagline={onRemoveTagline} />)

    expect(screen.getByRole("img", { name: "Foto de Maria Souza" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Tirar a foto" }))
    await userEvent.click(screen.getByRole("button", { name: "Tirar a frase" }))
    expect(onRemovePhoto).toHaveBeenCalled()
    expect(onRemoveTagline).toHaveBeenCalled()
    await expectNoA11yViolations(container)
  })
})

describe("what the shop owes (IMPULSEIA-107)", () => {
  it("lays it out by due day, overdue first, and by affiliate with the Pix key", async () => {
    const { container } = render(<AffiliateOwedView owed={owed} />)

    expect(screen.getByText("R$ 630,00")).toBeInTheDocument()
    const due = within(screen.getByRole("region", { name: "Vencidos e de hoje" }))
    expect(due.getByText("Dia 10 de nov.")).toBeInTheDocument()
    expect(due.getAllByText("Atrasado")).toHaveLength(1)
    expect(due.getByText("Vence hoje")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Pagar João Silva" })).toHaveAttribute("href", "/afiliados/a-joao")
    expect(screen.getByText("Chave Pix: joao@pix.com")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("says there is nothing to pay", () => {
    render(<AffiliateOwedView owed={{ ...owed, due: [], upcomingDays: [], affiliates: [] }} />)

    expect(screen.getByText("Nada a pagar por enquanto.")).toBeInTheDocument()
    expect(screen.getByText("Nada vencido.")).toBeInTheDocument()
  })
})
