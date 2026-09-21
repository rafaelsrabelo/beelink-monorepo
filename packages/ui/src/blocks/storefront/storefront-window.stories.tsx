import type { Meta, StoryObj } from "@storybook/react-vite"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontWindow } from "./storefront-window"

const meta = {
  title: "Blocos/Vitrine/Janela da loja",
  component: StorefrontWindow,
  parameters: { layout: "fullscreen" },
  args: {
    name: "Padaria da Ana",
    description: "Pães, bolos e café da manhã, feitos no dia e entregues na região.",
    logoUrl: "https://res.cloudinary.com/demo/image/upload/w_200,h_200,c_fill/sample.jpg",
    colors: sampleColorPresets[4].colors,
    orderHref: "https://wa.me/5585999998888",
    links: [
      { network: "instagram" as const, href: "https://instagram.com/padariadaana" },
      { network: "tiktok" as const, href: "https://tiktok.com/@padariadaana" },
    ],
  },
} satisfies Meta<typeof StorefrontWindow>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** The banner layout, when the shopkeeper chose one and supplied an image. */
export const ComBanner: Story = {
  args: { bannerImageUrl: "https://res.cloudinary.com/demo/image/upload/w_1200,h_400,c_fill/sample.jpg" },
}

/** Four different colours, to show the window is the shopkeeper's and not ours. */
export const OutraLoja: Story = {
  args: {
    name: "Bewave Store",
    description: "Suplementos e acessórios para treino.",
    colors: sampleColorPresets[2].colors,
    links: [{ network: "instagram" as const, href: "https://instagram.com/bewave" }],
  },
}

/** A shop with no WhatsApp on file offers no order button, rather than one that goes nowhere. */
export const SemWhatsapp: Story = {
  args: { orderHref: undefined },
}
