import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { en } from "../../locales/en"
import { StoreCreateForm } from "./store-create-form"
import {
  sampleColorPresets,
  sampleOpeningTemplates,
  sampleStoreCategories,
  sampleStoreCreateValues,
} from "./store.fixtures"

const meta = {
  title: "Blocos/Loja/Criar loja",
  component: StoreCreateForm,
  parameters: { layout: "padded" },
  args: {
    defaultValues: sampleStoreCreateValues,
    onSubmit: fn(),
    onZipCodeLookup: fn(async () => null),
    onImageUpload: fn(async () => "https://res.cloudinary.com/demo/image/upload/sample.jpg"),
    categories: sampleStoreCategories,
    colorPresets: sampleColorPresets,
  },
} satisfies Meta<typeof StoreCreateForm>

export default meta
type Story = StoryObj<typeof meta>

/** An empty shop. Typing a name fills the address below it until the address is touched. */
export const Padrao: Story = {}

/** Halfway through: the address was proposed from the name and has not been overridden. */
export const Preenchido: Story = {
  args: {
    defaultValues: {
      ...sampleStoreCreateValues,
      slug: "doces-da-ana",
      identity: {
        ...sampleStoreCreateValues.identity,
        name: "Doces da Ana",
        description: "Bolos e doces feitos no dia, entregues na região.",
        categoryId: sampleStoreCategories[1].id,
      },
    },
  },
}

/** The create is in flight: one button says so and every field stops taking edits. */
export const Criando: Story = {
  args: { pending: true },
}

/** What the screen shows after the API answers, for instance, STORE_SLUG_TAKEN. */
export const ComErroDoServidor: Story = {
  args: { error: "Esse endereço de loja já está em uso. Escolha outro." },
}

/** No upload wired up yet: every image field degrades to its address input and nothing else moves. */
export const SemEnvioDeImagem: Story = {
  args: { onImageUpload: undefined },
}

export const EmIngles: Story = {
  args: { messages: en },
}

/**
 * With the catalogue's models wired in: walk to the last step, where "Página inicial" offers the
 * default page, chosen, and the models a shop's home may open with.
 */
export const ComModelosDePaginaInicial: Story = {
  args: {
    defaultValues: {
      ...sampleStoreCreateValues,
      slug: "doces-da-ana",
      identity: { ...sampleStoreCreateValues.identity, name: "Doces da Ana" },
      social: { ...sampleStoreCreateValues.social, whatsapp: "11999998888" },
    },
    openingTemplates: { templates: sampleOpeningTemplates, state: "ready" },
    onShopKindChange: fn(),
  },
}
