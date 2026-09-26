// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Lib
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontProductCard } from "./storefront-product-card"

const meta = {
  title: "Blocos/Vitrine/Card de produto",
  component: StorefrontProductCard,
  parameters: { layout: "centered" },
  decorators: [(Story) => <div className="w-[259px]" style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: {
    product: {
      id: "p1",
      slug: "pre-treino-haze-hardcore-300g",
      name: "Pré-Treino Haze Hardcore 300g",
      priceCents: 11990,
      compareAtPriceCents: 14990,
      imageUrl: "https://picsum.photos/seed/haze/520/460",
    },
    href: "/mutante/produtos/pre-treino-haze-hardcore-300g",
    locale: "pt-BR",
  },
} satisfies Meta<typeof StorefrontProductCard>

export default meta
type Story = StoryObj<typeof meta>

/** O card de 5a na largura da grade de quatro: foto rente, nome em duas linhas, preço dividido e o selo. */
export const Padrao: Story = {}

/** Sem desconto e sem foto: o quadro diz que não há foto, e o preço fica sozinho. */
export const SemFotoNemDesconto: Story = {
  args: { product: { id: "p2", slug: "creatina", name: "Creatina Monohidratada 300g", priceCents: 9990, compareAtPriceCents: null, imageUrl: null } },
}

/** Um nome longo: duas linhas e corta, sem empurrar o preço. */
export const NomeLongo: Story = {
  args: {
    product: {
      id: "p3",
      slug: "kit",
      name: "Kit Pré-Treino Haze Hardcore 300g + Creatina Monohidratada 300g + Coqueteleira 700ml edição limitada",
      priceCents: 129990,
      compareAtPriceCents: 159990,
      imageUrl: "https://picsum.photos/seed/kit/520/460",
    },
  },
}

/** Com opções: a linha "4 sabores" sob o nome diz o que o visitante vai escolher na página do produto. */
export const ComOpcoes: Story = {
  args: {
    product: {
      id: "p4",
      slug: "whey",
      name: "Whey Protein Isolado 900g",
      priceCents: 18990,
      compareAtPriceCents: null,
      imageUrl: "https://picsum.photos/seed/whey/520/460",
      hasOptions: true,
      optionSummary: { name: "Sabor", valueCount: 4 },
    },
  },
}
