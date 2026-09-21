import type { Meta, StoryObj } from "@storybook/react-vite"

import { en } from "../../locales/en"
import { StoreColorPreview } from "./store-color-preview"
import { sampleColorPresets, sampleStoreColors } from "./store.fixtures"

const meta = {
  title: "Blocos/Loja/Prévia das cores",
  component: StoreColorPreview,
  args: { colors: sampleStoreColors },
} satisfies Meta<typeof StoreColorPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** Another shop's palette, through the same block: the colours are data, not a variant. */
export const OutraPaleta: Story = {
  args: { colors: sampleColorPresets[1].colors },
}

export const EmIngles: Story = {
  args: { messages: en },
}
