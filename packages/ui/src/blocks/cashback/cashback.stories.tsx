import type { Meta, StoryObj } from "@storybook/react-vite"

import { CashbackAdjustForm } from "./cashback-adjust-form"
import { CashbackFailed } from "./cashback-failed"
import { CashbackOwed } from "./cashback-owed"
import { CashbackSettingsForm } from "./cashback-settings-form"
import { CashbackSkeleton } from "./cashback-skeleton"
import { customer, owed, settings } from "./cashback.fixtures"
import { CustomerCashback } from "./customer-cashback"
import { OrderCashback } from "./order-cashback"

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
const date = (iso: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso))
const noop = () => {}

/** The panel's Cashback screen as the web composes it: what the shop owes over its rules. */
function CashbackScreen() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <CashbackOwed owed={owed} money={money} />
      <CashbackSettingsForm value={settings} onChange={noop} onSubmit={noop} example="Num pedido de R$ 100,00, o cliente ganha R$ 5,00 de cashback, para usar em até 90 dias depois da entrega." />
    </div>
  )
}

const meta = {
  title: "Blocos/Painel/Cashback",
  component: CashbackScreen,
} satisfies Meta<typeof CashbackScreen>

export default meta
type Story = StoryObj<typeof meta>

/** As regras da loja e o que ela deve em crédito. */
export const Tela: Story = {}

/** O formulário com os campos recusados e a resposta da API. */
export const RegrasRecusadas: Story = {
  render: () => (
    <div className="max-w-3xl">
      <CashbackSettingsForm
        value={{ ...settings, rate: "0", validityDays: "0" }}
        onChange={noop}
        onSubmit={noop}
        issues={{ rate: "Informe um percentual entre 0,01% e 100%.", validityDays: "Informe de 1 a 3650 dias." }}
        example="Com o cashback desligado, os pedidos novos não geram crédito."
        error="Alguma regra está fora do permitido. Confira os campos."
      />
    </div>
  ),
}

/** O cashback na ficha do cliente: saldo, pendente, vencimento e o extrato. */
export const NaFichaDoCliente: Story = {
  render: () => (
    <div className="max-w-2xl">
      <CustomerCashback cashback={customer} money={money} date={date} onAdjust={noop} />
    </div>
  ),
}

/** O ajuste manual aberto, no lugar do botão. */
export const AjusteManual: Story = {
  render: () => (
    <div className="max-w-2xl">
      <CustomerCashback
        cashback={customer}
        money={money}
        date={date}
        onAdjust={noop}
        adjustment={<CashbackAdjustForm value={{ direction: "TAKE", amount: "20,00", reason: "Lançado em dobro" }} onChange={noop} onSubmit={noop} onCancel={noop} error="O cliente tem menos crédito do que isso." />}
      />
    </div>
  ),
}

/** O cashback de um pedido: disponível, e um desfeito depois de o cliente gastar parte. */
export const NoPedido: Story = {
  render: () => (
    <div className="flex max-w-xs flex-col gap-4">
      <OrderCashback cashback={{ earnedCents: 500, rateBps: 500, status: "AVAILABLE", remainingCents: 500, availableAt: "2026-10-01T12:00:00.000Z", expiresAt: "2026-12-30T12:00:00.000Z", unrecoveredCents: 0 }} money={money} date={date} />
      <OrderCashback cashback={{ earnedCents: 500, rateBps: 500, status: "VOIDED", remainingCents: 0, availableAt: null, expiresAt: null, unrecoveredCents: 200 }} money={money} date={date} />
    </div>
  ),
}

export const Carregando: Story = { render: () => <CashbackSkeleton /> }

export const FalhouAoCarregar: Story = { render: () => <CashbackFailed onRetry={noop} /> }
