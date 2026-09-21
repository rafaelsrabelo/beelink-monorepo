import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { en } from "../../locales/en"
import { StoreSocialFields } from "./store-social-fields"
import { sampleStoreSettingsValues } from "./store.fixtures"

const meta = {
  title: "Blocos/Loja/Aba redes sociais",
  component: StoreSocialFields,
  parameters: { layout: "padded" },
  args: {
    value: sampleStoreSettingsValues.social,
    onChange: fn(),
  },
} satisfies Meta<typeof StoreSocialFields>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** WhatsApp is the only one that is not decoration: the order arrives there. */
export const SemWhatsapp: Story = {
  args: {
    value: { ...sampleStoreSettingsValues.social, whatsapp: "" },
    errors: { whatsapp: { message: "Informe o WhatsApp que recebe os pedidos" } },
  },
}

export const EmIngles: Story = {
  args: { messages: en },
}
