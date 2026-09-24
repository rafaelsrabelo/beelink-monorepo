// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontProductGallery } from "./storefront-product-gallery"

const meta = {
  title: "Blocos/Vitrine/Galeria do produto",
  component: StorefrontProductGallery,
  parameters: { layout: "padded" },
  args: {
    name: "Bolsa Amora",
    images: [
      { id: "1", url: "https://picsum.photos/seed/amora-1/800/800", alt: "De frente" },
      { id: "2", url: "https://picsum.photos/seed/amora-2/800/800", alt: null },
    ],
  },
} satisfies Meta<typeof StorefrontProductGallery>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const SemFoto: Story = { args: { images: [] } }
