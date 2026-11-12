import type { Meta, StoryObj } from "@storybook/react-vite"

import { AffiliateConfirmDialog } from "./affiliate-confirm-dialog"
import { AffiliateListSection } from "./affiliate-list-section"
import { AffiliateCommissionTab } from "./affiliate-commission-tab"
import { AffiliateGeneralTab } from "./affiliate-general-tab"
import { commission, invitedRecord, people, record, tableOptions } from "./affiliate-people.fixtures"
import { AffiliateRecordHeader } from "./affiliate-record-header"
import { AffiliateRecordTabs } from "./affiliate-record-tabs"
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

const general = { editing: null, draft: "", onEdit: noop, onDraft: noop, onSave: noop, onCancel: noop, onRemovePhoto: noop, onRemoveTagline: noop }

/** A ficha de um afiliado que vende, na aba Geral. */
export const Ficha: Story = {
  render: () => (
    <div className="flex max-w-4xl flex-col gap-6">
      <AffiliateRecordHeader name={record.name} email={record.email} status="ACTIVE" link={record.link} photoUrl={record.photoUrl} backHref="#lista" onAction={noop} />
      <AffiliateRecordTabs active="geral" hrefOf={(tab) => `#${tab}`} />
      <AffiliateGeneralTab affiliate={record} {...general} />
    </div>
  ),
}

/** A ficha de quem ainda não aceitou, editando o CPF. */
export const FichaConvidado: Story = {
  render: () => (
    <div className="flex max-w-4xl flex-col gap-6">
      <AffiliateRecordHeader name={invitedRecord.name} email={invitedRecord.email} status="INVITED" link={null} photoUrl={null} backHref="#lista" onAction={noop} notice="Convite reenviado para maria@exemplo.com. O link anterior deixou de valer." />
      <AffiliateRecordTabs active="geral" hrefOf={(tab) => `#${tab}`} />
      <AffiliateGeneralTab affiliate={invitedRecord} identityMissing {...general} editing="cpf" draft="529.982" />
    </div>
  ),
}

/** A aba Comissão: a tabela e o que ela paga. */
export const FichaComissao: Story = {
  render: () => (
    <div className="flex max-w-4xl flex-col gap-6">
      <AffiliateRecordTabs active="comissao" hrefOf={(tab) => `#${tab}`} />
      <AffiliateCommissionTab tables={tableOptions} tableId="t-influ" onTable={noop} onSaveTable={noop} onMakeOwn={noop} tableHref="#tabela" commission={commission} />
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
