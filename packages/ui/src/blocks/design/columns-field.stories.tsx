// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ColumnsField } from "./columns-field"

const meta = {
  title: "Blocos/Modo design/Colunas",
  component: ColumnsField,
  parameters: { layout: "padded" },
  args: { value: 0, onChange: () => {} },
} satisfies Meta<typeof ColumnsField>

export default meta
type Story = StoryObj<typeof meta>

/** "Automático": a grade decide. */
export const Automatico: Story = {}

export const Quatro: Story = { args: { value: 4 } }
