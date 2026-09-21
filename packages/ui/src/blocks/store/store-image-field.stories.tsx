import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { en } from "../../locales/en"
import { ptBR } from "../../locales/pt-BR"
import { StoreImageField } from "./store-image-field"

const sampleImage = "https://res.cloudinary.com/demo/image/upload/sample.jpg"

const meta = {
  title: "Blocos/Loja/Campo de imagem",
  component: StoreImageField,
  parameters: { layout: "padded" },
  args: {
    id: "store-logo",
    label: ptBR.store.identity.logoLabel,
    hint: ptBR.store.identity.logoHint,
    previewAlt: ptBR.store.identity.logoAlt,
    value: "",
    onChange: fn(),
    onUpload: fn(async () => sampleImage),
  },
} satisfies Meta<typeof StoreImageField>

export default meta
type Story = StoryObj<typeof meta>

export const Vazio: Story = {}

export const ComImagem: Story = {
  args: { value: sampleImage },
}

/** A banner is landscape, so its preview is too — the same block, a different shape. */
export const Banner: Story = {
  args: {
    id: "store-banner",
    label: ptBR.store.appearance.bannerImageLabel,
    hint: ptBR.store.appearance.bannerImageHint,
    previewAlt: ptBR.store.appearance.bannerAlt,
    aspect: "wide",
    value: sampleImage,
  },
}

export const Enviando: Story = {
  args: { pending: true },
}

/** No upload wired up: the block degrades to the address field alone, and nothing else changes. */
export const SemEnvio: Story = {
  args: { onUpload: undefined, value: sampleImage },
}

export const ComErro: Story = {
  args: { value: "nao-e-um-endereco", error: { message: "Informe um endereço válido" } },
}

export const EmIngles: Story = {
  args: {
    messages: en,
    label: en.store.identity.logoLabel,
    hint: en.store.identity.logoHint,
    previewAlt: en.store.identity.logoAlt,
  },
}
