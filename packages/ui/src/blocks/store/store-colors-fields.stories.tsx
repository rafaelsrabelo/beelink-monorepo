import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { en } from "../../locales/en"
import { StoreColorsFields } from "./store-colors-fields"
import { sampleColorPresets, sampleStoreColors } from "./store.fixtures"

const meta = {
  title: "Blocos/Loja/Cores da loja",
  component: StoreColorsFields,
  parameters: { layout: "padded" },
  args: {
    value: sampleStoreColors,
    onChange: fn(),
    presets: sampleColorPresets,
  },
} satisfies Meta<typeof StoreColorsFields>

export default meta
type Story = StoryObj<typeof meta>

/** The six palettes the legacy panel offered, as data — this package ships no colour of its own. */
export const Padrao: Story = {}

export const TemaVerde: Story = {
  args: { value: sampleColorPresets[1].colors },
}

/** No ready-made themes wired up: the four colours are still there to be set by hand. */
export const SemTemasProntos: Story = {
  args: { presets: [] },
}

export const ComErroDeCor: Story = {
  args: {
    value: { ...sampleStoreColors, primary: "azul" },
    errors: { primary: { message: "Informe uma cor no formato hexadecimal de 6 dígitos" } },
  },
}

export const Bloqueado: Story = {
  args: { disabled: true },
}

export const EmIngles: Story = {
  args: { messages: en },
}
