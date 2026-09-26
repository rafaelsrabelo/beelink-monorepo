// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontSplitBanner } from "./storefront-split-banner"

const meta = {
  title: "Blocos/Vitrine/Banner dividido",
  component: StorefrontSplitBanner,
  parameters: { layout: "padded" },
  args: {
    item: {
      id: "s",
      imageUrl: "https://picsum.photos/seed/split/1200/900",
      title: "Nova coleção de inverno",
      subtitle: "Peças quentes, feitas à mão, em quantidade pequena.",
      href: "/loja/inverno",
    },
  },
} satisfies Meta<typeof StorefrontSplitBanner>

export default meta
type Story = StoryObj<typeof meta>

/** Texto de um lado, foto do outro; empilha no celular. */
export const ComBotao: Story = {}

/** Um banner que não leva a lugar nenhum não tem botão. */
export const SemDestino: Story = { args: { item: { id: "s", imageUrl: "https://picsum.photos/seed/split/1200/900", title: "Feito à mão" } } }
