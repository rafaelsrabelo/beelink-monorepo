// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontCover } from "./storefront-cover"

const meta = {
  title: "Blocos/Vitrine/Capa",
  component: StorefrontCover,
  parameters: { layout: "fullscreen" },
  args: { banner: { imageUrl: "https://picsum.photos/seed/capa/1600/600", alt: "Pães do dia" } },
} satisfies Meta<typeof StorefrontCover>

export default meta
type Story = StoryObj<typeof meta>

/** A capa sobre a loja: alta, e um link quando o lojista deu um destino. */
export const SobreALoja: Story = { args: { tall: true, banner: { imageUrl: "https://picsum.photos/seed/capa/1600/600", href: "/padaria-da-ana?categoria=promocoes" } } }

/** A segunda capa, sob os produtos: uma faixa. */
export const SobOsProdutos: Story = {}
