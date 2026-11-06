// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ProductBulkBar } from "./product-bulk-bar"

const meta = {
  title: "Blocos/Catálogo/Produtos em lote",
  component: ProductBulkBar,
  parameters: { layout: "padded" },
  args: { count: 30, onActivate: () => {}, onDraft: () => {}, onClear: () => {} },
} satisfies Meta<typeof ProductBulkBar>

export default meta
type Story = StoryObj<typeof meta>

export const Selecionados: Story = {}

export const Um: Story = { args: { count: 1 } }

export const Ativando: Story = { args: { pending: "ACTIVE" } }

export const Recusado: Story = { args: { error: "Um dos produtos não é mais desta loja. Atualize a lista e tente de novo." } }
