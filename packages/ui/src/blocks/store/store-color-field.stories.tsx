import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { StoreColorField } from "./store-color-field"
import { sampleStoreColors } from "./store.fixtures"

const meta = {
  title: "Blocos/Loja/Campo de cor",
  component: StoreColorField,
  parameters: { layout: "padded" },
  args: {
    id: "store-color-primary",
    label: "Cor principal",
    pickerSuffix: "seletor de cor",
    value: sampleStoreColors.primary,
    onChange: fn(),
  },
} satisfies Meta<typeof StoreColorField>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** A colour the schema refuses: the field says so and keeps what was typed. */
export const ComErro: Story = {
  args: {
    value: "azul",
    error: { message: "Informe uma cor no formato hexadecimal de 6 dígitos" },
  },
}

export const Desabilitado: Story = {
  args: { disabled: true },
}
