import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { en } from "../../locales/en"
import { StoreAppearanceFields } from "./store-appearance-fields"
import { sampleColorPresets, sampleStoreSettingsValues } from "./store.fixtures"

const meta = {
  title: "Blocos/Loja/Aba aparência",
  component: StoreAppearanceFields,
  parameters: { layout: "padded" },
  args: {
    value: sampleStoreSettingsValues.appearance,
    onChange: fn(),
    presets: sampleColorPresets,
    onBannerUpload: fn(async () => "https://res.cloudinary.com/demo/image/upload/sample.jpg"),
  },
} satisfies Meta<typeof StoreAppearanceFields>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** With the banner layout the tab asks for the image; with the default one it does not. */
export const ComBanner: Story = {
  args: {
    value: { ...sampleStoreSettingsValues.appearance, layoutType: "BANNER" },
  },
}

/** The horizontal product card — the one `layoutSettings` key the panel offers a control for. */
export const CardHorizontal: Story = {
  args: {
    value: { ...sampleStoreSettingsValues.appearance, cardLayout: "horizontal" },
  },
}

/** No ready-made themes wired up: the four colours are still there to be set by hand. */
export const SemTemasProntos: Story = {
  args: { presets: [] },
}

export const ComErroDeCor: Story = {
  args: {
    value: {
      ...sampleStoreSettingsValues.appearance,
      colors: { ...sampleStoreSettingsValues.appearance.colors, primary: "azul" },
    },
    colorErrors: { primary: { message: "Informe uma cor no formato hexadecimal de 6 dígitos" } },
  },
}

export const EmIngles: Story = {
  args: { messages: en },
}
