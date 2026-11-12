import type { Meta, StoryObj } from "@storybook/react-vite"

import { AffiliateAdjustmentDialog } from "./affiliate-adjustment-dialog"
import { AffiliateBalanceCard } from "./affiliate-balance-card"
import { AffiliateFilterChip } from "./affiliate-filter-chip"
import { adjustmentValue, affiliateOptions, balance, creditedOrder, owed, payoutValue, settledOrder, shortBalance, statementRows, uncreditedOrder } from "./affiliate-money.fixtures"
import { AffiliateOwedView } from "./affiliate-owed-view"
import { AffiliatePayoutDialog } from "./affiliate-payout-dialog"
import { AffiliateStatement } from "./affiliate-statement"
import { AffiliatesTabs } from "./affiliates-tabs"
import { OrderAffiliateCard } from "./order-affiliate-card"
import { OrderAffiliateDialog } from "./order-affiliate-dialog"
import { OrderAffiliateField } from "./order-affiliate-field"

const noop = () => {}

/** What the shop owes, as the web composes it under the affiliate sections. */
function OwedScreen() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <AffiliatesTabs active="owed" affiliatesHref="#afiliados" owedHref="#a-pagar" settingsHref="#configuracoes" tablesHref="#tabelas" />
      <AffiliateOwedView owed={owed} />
    </div>
  )
}

const meta = {
  title: "Blocos/Painel/Afiliados/Dinheiro",
  component: OwedScreen,
} satisfies Meta<typeof OwedScreen>

export default meta
type Story = StoryObj<typeof meta>

/** O "quanto devo", por vencimento e por afiliado. */
export const APagar: Story = {}

/** Nada a pagar. */
export const NadaAPagar: Story = { render: () => <AffiliateOwedView owed={{ ...owed, due: [], upcomingDays: [], affiliates: [] }} /> }

/** O afiliado na coluna do pedido: creditado, com troca e estorno; liberado; sem afiliado. */
export const NoPedido: Story = {
  render: () => (
    <div className="flex max-w-xs flex-col gap-4">
      <OrderAffiliateCard view={creditedOrder} onChange={noop} />
      <OrderAffiliateCard view={settledOrder} />
      <OrderAffiliateCard view={uncreditedOrder} onChange={noop} />
    </div>
  ),
}

/** Trocar o afiliado do pedido. */
export const TrocarAfiliado: Story = {
  render: () => <OrderAffiliateDialog open onOpenChange={noop} value={{ affiliateId: "a-joao", reason: "" }} onChange={noop} onSubmit={noop} options={affiliateOptions} />,
}

/** O campo da venda registrada no painel, e o filtro da lista de pedidos. */
export const VendaEFiltro: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-4">
      <OrderAffiliateField options={affiliateOptions} value="a-maria" onChange={noop} />
      <AffiliateFilterChip name="Maria Souza" clearHref="#pedidos" />
    </div>
  ),
}

/** O saldo e o extrato na ficha; o saldo negativo. */
export const NaFicha: Story = {
  render: () => (
    <div className="flex max-w-4xl flex-col gap-6">
      <AffiliateBalanceCard balance={balance} ordersHref="#pedidos" onPay={noop} onAdjust={noop}>
        <AffiliateStatement rows={statementRows} page={1} pageSize={3} total={7} onPage={noop} />
      </AffiliateBalanceCard>
      <AffiliateBalanceCard balance={shortBalance} ordersHref="#pedidos" onPay={noop} onAdjust={noop} />
    </div>
  ),
}

/** Ajustar o saldo. */
export const Ajuste: Story = { render: () => <AffiliateAdjustmentDialog open onOpenChange={noop} value={adjustmentValue} onChange={noop} onSubmit={noop} /> }

/** Registrar um pagamento feito por fora. */
export const Pagamento: Story = {
  render: () => <AffiliatePayoutDialog open onOpenChange={noop} value={payoutValue} onChange={noop} onSubmit={noop} available="R$ 210,00" maxDay="2026-11-20" pixKey="joao@pix.com" />,
}
