import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { en } from "../../locales/en"
import { StoreSettingsForm } from "./store-settings-form"
import {
  sampleColorPresets,
  sampleStoreCategories,
  sampleStoreSettingsValues,
} from "./store.fixtures"

const meta = {
  title: "Blocos/Loja/Configurações da loja",
  component: StoreSettingsForm,
  parameters: { layout: "padded" },
  args: {
    slug: "doces-da-ana",
    defaultValues: sampleStoreSettingsValues,
    onSubmit: fn(),
    onZipCodeLookup: fn(async () => null),
    onImageUpload: fn(async () => "https://res.cloudinary.com/demo/image/upload/sample.jpg"),
    categories: sampleStoreCategories,
    colorPresets: sampleColorPresets,
  },
} satisfies Meta<typeof StoreSettingsForm>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** The save is in flight: one button says so and every field stops taking edits. */
export const Salvando: Story = {
  args: { pending: true },
}

/** What the screen shows after the API answers, for instance, STORE_SLUG_TAKEN. */
export const ComErroDoServidor: Story = {
  args: { error: "Não foi possível salvar as alterações. Tente novamente." },
}

/** A shop carried over without a WhatsApp: saving opens the tab that is refusing. */
export const SemWhatsapp: Story = {
  args: {
    defaultValues: {
      ...sampleStoreSettingsValues,
      social: { ...sampleStoreSettingsValues.social, whatsapp: "" },
    },
  },
}

export const EmIngles: Story = {
  args: { messages: en },
}
