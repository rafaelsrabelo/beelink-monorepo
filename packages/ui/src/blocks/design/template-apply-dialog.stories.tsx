// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

// Block
import { TemplateApplyDialog } from "./template-apply-dialog"

const meta = {
  title: "Blocos/Modo design/Aplicar modelo",
  component: TemplateApplyDialog,
  args: { templateName: "Vitrine com capa", pageName: "Página inicial", unpublished: false, onConfirm: fn(), onCancel: fn() },
} satisfies Meta<typeof TemplateApplyDialog>

export default meta
type Story = StoryObj<typeof meta>

/** O rascunho é igual ao que está no ar: só o que muda e o que não muda. */
export const Pergunta: Story = {}

/** O rascunho tem alterações não publicadas: a pergunta diz que elas se perdem. */
export const ComAlteracoesNaoPublicadas: Story = { args: { unpublished: true } }

/** A escrita está fora: os dois botões esperam. */
export const Aplicando: Story = { args: { applying: true } }

/** A API recusou: a frase fica na pergunta, que continua aberta. */
export const Recusado: Story = { args: { error: "Esse produto não é desta loja. Escolha outro." } }
