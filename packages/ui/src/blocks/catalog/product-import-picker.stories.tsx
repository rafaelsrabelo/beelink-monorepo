// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ProductImportPicker } from "./product-import-picker"

const meta = {
  title: "Blocos/Catálogo/Importar produtos — escolher o arquivo",
  component: ProductImportPicker,
  parameters: { layout: "padded" },
  args: { onPick: () => {} },
} satisfies Meta<typeof ProductImportPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Vazio: Story = {}

export const Recusado: Story = {
  args: { error: "A IA não encontrou produtos nesse documento. Confira se é o cardápio e tente de novo." },
}

export const Desligado: Story = { args: { disabled: true } }
