// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ProductOrderFooter } from "./product-order-footer"

const meta = {
  title: "Blocos/Catálogo/Salvar a ordem dos produtos",
  component: ProductOrderFooter,
  parameters: { layout: "padded" },
  args: { dirty: true, onSave: () => {}, onUndo: () => {} },
} satisfies Meta<typeof ProductOrderFooter>

export default meta
type Story = StoryObj<typeof meta>

export const PorSalvar: Story = {}

export const SemMudanca: Story = { args: { dirty: false } }

export const Salvando: Story = { args: { pending: true } }

export const Salvo: Story = { args: { dirty: false, saved: true } }

export const Recusado: Story = {
  args: { error: "Um produto entrou ou saiu da loja enquanto você ordenava. A lista já foi ajustada: confira e salve de novo." },
}

/** Asked when a way out is taken with the order unsaved. */
export const Saindo: Story = { args: { leaving: true } }
