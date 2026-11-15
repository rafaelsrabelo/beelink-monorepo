import type { Meta, StoryObj } from "@storybook/react-vite"

import { AffiliateApplicationApproveDialog } from "./affiliate-application-approve-dialog"
import { AffiliateApplicationsList } from "./affiliate-applications-list"
import { AffiliatePageCard } from "./affiliate-page-card"
import { AffiliatePageEditor } from "./affiliate-page-editor"
import { applications, decided, filterHrefs, pageCard, pageContent, pagePreview, pageTables } from "./affiliate-page.fixtures"

const noop = () => {}

/** The page in the programme's settings, open and live. */
function Card({ live = true }: { live?: boolean }) {
  return (
    <div className="max-w-3xl">
      <AffiliatePageCard
        value={{ ...pageCard, open: live }}
        onChange={noop}
        onSubmit={noop}
        address="lessari.com.br/seja-afiliado"
        viewHref="#pagina"
        editHref="#conteudo"
        tables={pageTables}
        status={live ? { live: true, message: "No ar: os visitantes já veem a página." } : { live: false, message: "Fechada: ninguém vê a página nem o banner." }}
        onCopy={noop}
      />
    </div>
  )
}

const meta = {
  title: "Blocos/Afiliados/Página de afiliados",
  component: Card,
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

/** Aberta e no ar. */
export const Cartao: Story = {}

/** Fechada: o cartão diz que ninguém a vê. */
export const CartaoFechado: Story = { args: { live: false } }

/** Todo texto da página, com a prévia do topo. */
export const Editor: Story = {
  render: () => <AffiliatePageEditor value={pageContent} onChange={noop} onRestore={noop} onSubmit={noop} preview={pagePreview} backHref="#configuracoes" viewHref="#pagina" />,
}

/** Um título longo demais, dito no campo. */
export const EditorRecusado: Story = {
  render: () => (
    <AffiliatePageEditor
      value={{ ...pageContent, title: "x".repeat(130) }}
      onChange={noop}
      onRestore={noop}
      onSubmit={noop}
      preview={pagePreview}
      backHref="#configuracoes"
      viewHref="#pagina"
      issues={{ title: "Até 120 caracteres." }}
      error="Algum texto passou do tamanho ou ficou incompleto. Confira os campos marcados."
    />
  ),
}

/** As candidaturas novas. */
export const Candidaturas: Story = {
  render: () => <AffiliateApplicationsList status="PENDING" filterHrefs={filterHrefs} pendingCount={2} applications={applications} onApprove={noop} onRefuse={noop} />,
}

/** As aprovadas, com o que virou de cada uma. */
export const CandidaturasAprovadas: Story = {
  render: () => <AffiliateApplicationsList status="APPROVED" filterHrefs={filterHrefs} pendingCount={2} applications={decided} onApprove={noop} onRefuse={noop} />,
}

/** Nenhuma recusada. */
export const CandidaturasVazias: Story = {
  render: () => <AffiliateApplicationsList status="REFUSED" filterHrefs={filterHrefs} pendingCount={0} applications={[]} onApprove={noop} onRefuse={noop} />,
}

/** A pergunta antes de aprovar, com a tabela. */
export const Aprovar: Story = {
  render: () => <AffiliateApplicationApproveDialog application={applications[0]!} tables={pageTables} tableId="padrao" onTableChange={noop} onConfirm={noop} onCancel={noop} />,
}
