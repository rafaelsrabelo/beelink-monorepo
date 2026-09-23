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
    recommendedSize: { width: 400, height: 400 },
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
export const Section: Story = {
  args: {
    id: "store-banner",
    label: ptBR.store.appearance.bannerImageLabel,
    hint: ptBR.store.appearance.bannerImageHint,
    previewAlt: ptBR.store.appearance.bannerAlt,
    aspect: "wide",
    recommendedSize: { width: 1200, height: 400 },
    value: sampleImage,
  },
}

export const Enviando: Story = {
  args: { pending: true },
}

/** No upload wired up: the area goes inert rather than pretending it can take a file. */
export const SemEnvio: Story = {
  args: { onUpload: undefined },
}

/** The specs follow the props, so a different ceiling is a different sentence and nothing else. */
export const OutrosLimites: Story = {
  args: {
    label: ptBR.store.appearance.bannerImageLabel,
    hint: ptBR.store.appearance.bannerImageHint,
    previewAlt: ptBR.store.appearance.bannerAlt,
    accept: "image/jpeg,image/gif,image/png",
    maxSizeBytes: 5 * 1024 * 1024,
    recommendedSize: { width: 1200, height: 400 },
  },
}

export const ComErro: Story = {
  args: { error: { message: "Escolha uma imagem para a loja" } },
}

export const EmIngles: Story = {
  args: {
    messages: en,
    label: en.store.identity.logoLabel,
    hint: en.store.identity.logoHint,
    previewAlt: en.store.identity.logoAlt,
  },
}
