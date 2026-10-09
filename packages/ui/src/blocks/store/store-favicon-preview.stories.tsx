import type { Meta, StoryObj } from "@storybook/react-vite"

import { en } from "../../locales/en"
import { StoreFaviconPreview } from "./store-favicon-preview"

const sampleImage = "https://res.cloudinary.com/demo/image/upload/sample.jpg"

const meta = {
  title: "Blocos/Loja/Prévia do ícone do navegador",
  component: StoreFaviconPreview,
  parameters: { layout: "padded" },
  args: { faviconUrl: sampleImage, logoUrl: "", title: "Doces da Ana" },
} satisfies Meta<typeof StoreFaviconPreview>

export default meta
type Story = StoryObj<typeof meta>

export const ComIcone: Story = {}

/** No icon chosen: the shop's pages declare its logo, so the tab shows that. */
export const SoComLogo: Story = {
  args: { faviconUrl: "", logoUrl: sampleImage },
}

/** Neither: the platform's own, or a neutral glyph where the screen handed none. */
export const SemIconeNemLogo: Story = {
  args: { faviconUrl: "", logoUrl: "" },
}

export const NomeLongo: Story = {
  args: { title: "Doces da Ana — confeitaria artesanal, bolos e tortas sob encomenda" },
}

export const English: Story = {
  args: { faviconUrl: "", logoUrl: sampleImage, messages: en },
}
