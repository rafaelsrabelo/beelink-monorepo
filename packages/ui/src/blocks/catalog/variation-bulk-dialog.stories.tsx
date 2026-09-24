// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { VariationBulkDialog } from "./variation-bulk-dialog"

const meta = {
  title: "Blocos/Catálogo/Variações/Edição em massa",
  component: VariationBulkDialog,
  parameters: { layout: "centered" },
  args: {
    title: "Mesmo preço para as 3 selecionadas",
    label: "Preço",
    inputMode: "decimal",
    onApply: () => {},
    onClose: () => {},
  },
} satisfies Meta<typeof VariationBulkDialog>

export default meta
type Story = StoryObj<typeof meta>

export const MesmoPreco: Story = {}

export const DefinirEstoque: Story = {
  args: { title: "Definir estoque das 3 selecionadas", label: "Estoque", inputMode: "numeric" },
}
