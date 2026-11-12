import type { Meta, StoryObj } from "@storybook/react-vite"

import { AffiliateSettingsForm } from "./affiliate-settings-form"
import { AffiliatesFailed } from "./affiliates-failed"
import { AffiliatesSkeleton } from "./affiliates-skeleton"
import { AffiliatesTabs } from "./affiliates-tabs"
import { calendar, categoryRates, rates, settings, tables } from "./affiliates.fixtures"
import { CommissionCategoryRateList } from "./commission-category-rate-list"
import { CommissionGeneralRate } from "./commission-general-rate"
import { CommissionRateList } from "./commission-rate-list"
import { CommissionTableDialog } from "./commission-table-dialog"
import { CommissionTableList } from "./commission-table-list"

const noop = () => {}

/** The panel's affiliate settings as the web composes them: the sections, then the form. */
function SettingsScreen() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <AffiliatesTabs active="settings" affiliatesHref="#afiliados" owedHref="#a-pagar" settingsHref="#configuracoes" tablesHref="#tabelas" />
      <AffiliateSettingsForm value={settings} onChange={noop} onSubmit={noop} calendar={calendar} />
    </div>
  )
}

const meta = {
  title: "Blocos/Painel/Afiliados",
  component: SettingsScreen,
} satisfies Meta<typeof SettingsScreen>

export default meta
type Story = StoryObj<typeof meta>

/** As configurações do programa, com o calendário do mês. */
export const Configuracoes: Story = {}

/** O formulário com os campos recusados e a resposta da API. */
export const ConfiguracoesRecusadas: Story = {
  render: () => (
    <div className="max-w-4xl">
      <AffiliateSettingsForm
        value={{ ...settings, payoutDelayDays: "90" }}
        onChange={noop}
        onSubmit={noop}
        calendar={[]}
        issues={{ payoutDelayDays: "Informe de 0 a 60 dias." }}
        error="Alguma configuração está fora do permitido. Confira os campos."
      />
    </div>
  ),
}

/** As tabelas de comissão, a Padrão primeiro. */
export const Tabelas: Story = {
  render: () => (
    <div className="flex max-w-4xl flex-col gap-6">
      <AffiliatesTabs active="tables" affiliatesHref="#afiliados" owedHref="#a-pagar" settingsHref="#configuracoes" tablesHref="#tabelas" />
      <CommissionTableList tables={tables} hrefOf={(id) => `#${id}`} onCreate={noop} onEdit={noop} onDelete={noop} />
    </div>
  ),
}

/** Criar uma tabela, com o nome repetido. */
export const NovaTabela: Story = {
  render: () => (
    <CommissionTableDialog open onOpenChange={noop} mode="create" value={{ name: "Influencers", rate: "15" }} onChange={noop} onSubmit={noop} error="Já existe uma tabela com esse nome." />
  ),
}

/** Os percentuais de uma tabela: o geral, por categoria e por produto — um próprio, um que segue a categoria, um que segue o geral e um sendo digitado. */
export const PercentuaisDaTabela: Story = {
  render: () => (
    <div className="flex max-w-4xl flex-col gap-6">
      <CommissionGeneralRate value="10" onChange={noop} onSubmit={noop} pristine />
      <CommissionCategoryRateList rows={categoryRates} onType={noop} onSave={noop} onReset={noop} />
      <CommissionRateList rows={rates} search="" onSearch={noop} onType={noop} onSave={noop} onReset={noop} emptyText="A loja ainda não tem produtos." status="Comissão de Whey Concentrado salva." />
    </div>
  ),
}

/** Enquanto carrega, e quando a leitura falha. */
export const CarregandoEFalha: Story = {
  render: () => (
    <div className="flex max-w-4xl flex-col gap-6">
      <AffiliatesSkeleton />
      <AffiliatesSkeleton shape="list" />
      <AffiliatesFailed onRetry={noop} />
    </div>
  ),
}
