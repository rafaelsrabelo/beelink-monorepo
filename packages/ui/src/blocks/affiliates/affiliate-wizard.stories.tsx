import type { Meta, StoryObj } from "@storybook/react-vite"

// Icons
import { PercentIcon } from "lucide-react"

import { AffiliateCommissionBase } from "./affiliate-commission-base"
import { AffiliateCommissionTree } from "./affiliate-commission-tree"
import { AffiliateDocumentFields } from "./affiliate-document-fields"
import { AffiliateDocumentSection } from "./affiliate-document-section"
import { AffiliateInviteSent } from "./affiliate-invite-sent"
import { AffiliatePersonFields } from "./affiliate-person-fields"
import { AffiliateReviewCards } from "./affiliate-review-cards"
import { AffiliateWizardFrame } from "./affiliate-wizard-frame"
import { chosenFiles, documentTypes, emptyFiles, person, review, starts, tree, wizardSteps } from "./affiliate-wizard.fixtures"

const noop = () => {}

/** The commission step, as the web composes it inside the frame. */
function CommissionStep() {
  return (
    <AffiliateWizardFrame steps={wizardSteps} onStep={noop} title="Monte a tabela de comissão" subtitle="Escolha de onde partir, defina o valor base e, se quiser, crie exceções por categoria ou por produto." card={{ icon: <PercentIcon className="size-5" />, title: "Tabela de comissão", description: "De onde partir, valor base e exceções" }} onBack={noop} primary="Continuar" onPrimary={noop} wide>
      <AffiliateCommissionBase starts={starts} startId="t-padrao" onStart={noop} base={12} onBase={noop} />
      <AffiliateCommissionTree categories={tree} search="" onSearch={noop} onToggle={noop} onCustomize={noop} onRate={noop} onReset={noop} />
    </AffiliateWizardFrame>
  )
}

const meta = {
  title: "Blocos/Painel/Afiliados/Convite passo a passo",
  component: CommissionStep,
  parameters: { layout: "padded" },
} satisfies Meta<typeof CommissionStep>

export default meta
type Story = StoryObj<typeof meta>

/** Passo 2: de onde partir, a comissão padrão e as exceções por categoria e produto. */
export const Comissao: Story = {}

/** Passo 1, com o erro debaixo do campo. */
export const Dados: Story = {
  render: () => (
    <AffiliateWizardFrame steps={wizardSteps.map((step, index) => ({ ...step, state: index === 0 ? "current" : "pending" }))} onStep={noop} title="Quem você quer convidar?" subtitle="O convite vai para o e-mail e vale por 7 dias." card={{ icon: <PercentIcon className="size-5" />, title: "Dados do afiliado", description: "Telefone e CPF só a loja vê" }} primary="Continuar" onPrimary={noop}>
      <AffiliatePersonFields value={{ ...person, cpf: "111.111.111-11" }} onChange={noop} issues={{ cpf: "Esse CPF não é válido." }} />
    </AffiliateWizardFrame>
  ),
}

/** Passo 3: o tipo e os dois lados, um já escolhido. */
export const Documento: Story = { render: () => <AffiliateDocumentFields types={documentTypes} type="RG" onType={noop} files={chosenFiles} accept="image/jpeg,image/png,image/webp,application/pdf" onFile={noop} onRemove={noop} showLater /> }

/** Passo 4: um cartão por passo, e a anotação. */
export const Revisao: Story = { render: () => <AffiliateReviewCards view={review} onEdit={noop} note="" onNote={noop} /> }

/** Depois de enviar. */
export const Enviado: Story = { render: () => <AffiliateInviteSent email="joao@exemplo.com" recordHref="#ficha" onAnother={noop} /> }

/** Na ficha: o documento que faltou no convite. */
export const DocumentoPendente: Story = {
  render: () => <AffiliateDocumentSection document={null} replacing={false} onReplace={noop} onCancel={noop} fields={{ types: documentTypes, type: "CNH", onType: noop, files: emptyFiles, accept: "image/jpeg", onFile: noop, onRemove: noop }} onSend={noop} canSend={false} sending={false} />,
}
