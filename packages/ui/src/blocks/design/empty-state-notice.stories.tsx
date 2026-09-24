// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { EmptyStateNotice } from "./empty-state-notice"

const meta = {
  title: "Blocos/Modo design/Aviso de bloco vazio",
  component: EmptyStateNotice,
  parameters: { layout: "padded" },
  args: {
    title: "Nenhuma categoria aparece na loja",
    body: "4 categorias ainda não têm produto, e categoria sem produto não aparece na loja.",
    action: { label: "Vincular produtos às categorias", href: "/admin/loja/products" },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EmptyStateNotice>

export default meta
type Story = StoryObj<typeof meta>

/** A causa, e o conserto em outra aba — o rascunho do arranjo fica onde está. */
export const CategoriasSemProduto: Story = {}

/** Quando o conserto está na própria folha, o aviso só diz a causa. */
export const ConsertoNaFolha: Story = {
  args: {
    title: "Esta fonte não traz nenhum produto agora",
    body: "A vitrine não aparece na loja enquanto a fonte estiver vazia. Escolha outra fonte aqui embaixo.",
    action: undefined,
  },
}
