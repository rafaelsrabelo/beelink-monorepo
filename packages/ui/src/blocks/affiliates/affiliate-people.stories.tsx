import type { Meta, StoryObj } from "@storybook/react-vite"

import { AffiliateConfirmDialog } from "./affiliate-confirm-dialog"
import { AffiliateInviteDialog } from "./affiliate-invite-dialog"
import { AffiliateListSection } from "./affiliate-list-section"
import { inviteValue, invitedRecord, people, record, recordValue, recordValueMissing, tableOptions } from "./affiliate-people.fixtures"
import { AffiliateRecordActions } from "./affiliate-record-actions"
import { AffiliateRecordDetails } from "./affiliate-record-details"
import { AffiliateRecordForm } from "./affiliate-record-form"
import { AffiliateRows } from "./affiliate-rows"
import { AffiliateStatusTabs } from "./affiliate-status-tabs"
import { AffiliatesTabs } from "./affiliates-tabs"

const noop = () => {}

/** The shop's affiliates as the web composes them: the sections, the list with its filter. */
function ListScreen() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <AffiliatesTabs active="affiliates" affiliatesHref="#afiliados" owedHref="#a-pagar" settingsHref="#configuracoes" tablesHref="#tabelas" />
      <AffiliateListSection onInvite={noop}>
        <AffiliateStatusTabs value={null} onValueChange={noop}>
          <AffiliateRows affiliates={people} hrefOf={(id) => `#${id}`} />
        </AffiliateStatusTabs>
      </AffiliateListSection>
    </div>
  )
}

const meta = {
  title: "Blocos/Painel/Afiliados/Pessoas",
  component: ListScreen,
} satisfies Meta<typeof ListScreen>

export default meta
type Story = StoryObj<typeof meta>

/** A lista, com as abas de situação. */
export const Lista: Story = {}

/** Uma loja que ainda não convidou ninguém. */
export const ListaVazia: Story = {
  render: () => (
    <div className="max-w-4xl">
      <AffiliateListSection onInvite={noop}>
        <AffiliateStatusTabs value={null} onValueChange={noop}>
          <AffiliateRows affiliates={[]} hrefOf={(id) => `#${id}`} />
        </AffiliateStatusTabs>
      </AffiliateListSection>
    </div>
  ),
}

/** O convite, num diálogo. */
export const Convidar: Story = {
  render: () => <AffiliateInviteDialog open onOpenChange={noop} value={inviteValue} onChange={noop} onSubmit={noop} tables={tableOptions} />,
}

/** O convite recusado: os campos e a resposta da API. */
export const ConvidarRecusado: Story = {
  render: () => (
    <AffiliateInviteDialog
      open
      onOpenChange={noop}
      value={{ ...inviteValue, email: "maria@" }}
      onChange={noop}
      onSubmit={noop}
      tables={tableOptions}
      issues={{ email: "Informe um e-mail válido." }}
      error="Este e-mail já é de um afiliado da loja."
    />
  ),
}

/** A ficha de um afiliado que vende. */
export const Ficha: Story = {
  render: () => (
    <div className="flex max-w-4xl flex-col gap-6">
      <AffiliateRecordDetails affiliate={record} />
      <AffiliateRecordForm value={recordValue} onChange={noop} onSubmit={noop} tables={tableOptions} pristine />
      <AffiliateRecordActions status="ACTIVE" onAction={noop} />
    </div>
  ),
}

/** A ficha de quem ainda não aceitou. */
export const FichaConvidado: Story = {
  render: () => (
    <div className="flex max-w-4xl flex-col gap-6">
      <AffiliateRecordDetails affiliate={invitedRecord} />
      <AffiliateRecordForm value={recordValueMissing} onChange={noop} onSubmit={noop} tables={tableOptions} identityMissing pristine />
      <AffiliateRecordActions status="INVITED" onAction={noop} notice="Convite reenviado para maria@exemplo.com. O link anterior deixou de valer." />
    </div>
  ),
}

/** A pergunta antes de encerrar. */
export const Encerrar: Story = {
  render: () => (
    <AffiliateConfirmDialog
      text={{ title: "Encerrar o vínculo?", question: "João Silva deixa de vender pela loja.", detail: "É definitivo.", confirm: "Encerrar", confirming: "Encerrando…" }}
      keepLabel="Voltar"
      onConfirm={noop}
      onCancel={noop}
    />
  ),
}
