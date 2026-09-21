import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { en } from "../../locales/en"
import { StoreIdentityFields } from "./store-identity-fields"
import { sampleStoreCategories, sampleStoreSettingsValues } from "./store.fixtures"

const meta = {
  title: "Blocos/Loja/Aba informações básicas",
  component: StoreIdentityFields,
  parameters: { layout: "padded" },
  args: {
    value: sampleStoreSettingsValues.identity,
    onChange: fn(),
    slug: "doces-da-ana",
    categories: sampleStoreCategories,
    onLogoUpload: fn(async () => "https://res.cloudinary.com/demo/image/upload/sample.jpg"),
  },
} satisfies Meta<typeof StoreIdentityFields>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** On the create form the address is still free, so the same block lets it be typed. */
export const EnderecoEditavel: Story = {
  args: { onSlugChange: fn(), slug: "doces-da-ana" },
}

/** No upload wired up: the logo degrades to its address field, and nothing else moves. */
export const SemEnvioDeLogo: Story = {
  args: { onLogoUpload: undefined },
}

/** The shop already has a logo: the picture it has now, and a way to drop it. */
export const ComLogo: Story = {
  args: {
    value: { ...sampleStoreSettingsValues.identity, logoUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg" },
  },
}

/** What the tab looks like after the schema refuses the form. */
export const ComErros: Story = {
  args: {
    value: { ...sampleStoreSettingsValues.identity, name: "A", logoUrl: "loja.png" },
    errors: {
      name: { message: "O nome da loja precisa ter ao menos 2 caracteres" },
      logoUrl: { message: "Informe um endereço começando com https://" },
    },
  },
}

/** While the save is in flight, nothing takes a second edit. */
export const Salvando: Story = {
  args: { disabled: true },
}

export const EmIngles: Story = {
  args: { messages: en },
}
