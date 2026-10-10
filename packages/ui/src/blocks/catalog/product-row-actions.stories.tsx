import type { Meta, StoryObj } from "@storybook/react-vite"

import { ProductRowActions } from "./product-row-actions"

const meta = {
  title: "Blocos/Catálogo/Ações do produto na lista",
  component: ProductRowActions,
  args: { name: "Whey Concentrado", draft: false, viewHref: "https://loja.exemplo/mutante/produtos/whey", onEdit: () => {}, onDelete: () => {} },
} satisfies Meta<typeof ProductRowActions>

export default meta
type Story = StoryObj<typeof meta>

/** Ver na vitrine, editar e excluir. */
export const Padrao: Story = {}

/** Um rascunho não tem página na vitrine: o olho fica no lugar, desligado, e diz por quê. */
export const Rascunho: Story = { args: { draft: true, viewHref: null } }

/** Enquanto a linha é excluída, editar e excluir não aceitam um segundo clique. */
export const Ocupada: Story = { args: { busy: true } }
