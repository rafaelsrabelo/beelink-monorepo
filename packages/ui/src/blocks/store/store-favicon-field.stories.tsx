import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { en } from "../../locales/en"
import { StoreFaviconField } from "./store-favicon-field"

const sampleImage = "https://res.cloudinary.com/demo/image/upload/sample.jpg"

const meta = {
  title: "Blocos/Loja/Campo do ícone do navegador",
  component: StoreFaviconField,
  parameters: { layout: "padded" },
  args: {
    value: "",
    logoUrl: "",
    storeName: "Doces da Ana",
    onChange: fn(),
    onUpload: fn(async () => sampleImage),
  },
} satisfies Meta<typeof StoreFaviconField>

export default meta
type Story = StoryObj<typeof meta>

export const Vazio: Story = {}

/** No icon yet, and a logo: the preview shows the logo, which is what the tab shows until one is sent. */
export const VazioComLogo: Story = {
  args: { logoUrl: sampleImage },
}

export const ComIcone: Story = {
  args: { value: sampleImage, logoUrl: sampleImage },
}

export const Enviando: Story = {
  args: { pending: true },
}

/** What the screen's form says of an address it refused. */
export const ComErro: Story = {
  args: { error: { message: "Informe um endereço começando com https://" } },
}

export const English: Story = {
  args: { messages: en },
}
