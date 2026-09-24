import type { CSSProperties } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontProductGrid } from "./storefront-product-grid"

const products = Array.from({ length: 8 }, (_, index) => ({
  id: `p${index + 1}`,
  slug: `bolsa-${index + 1}`,
  name: `Bolsa ${index + 1}`,
  priceCents: 8900 + index * 1500,
  compareAtPriceCents: index % 3 === 0 ? 24900 : null,
  imageUrl: index === 4 ? null : `https://picsum.photos/seed/grid${index}/600/600`,
}))

const meta = {
  title: "Blocos/Vitrine/Grade de produtos",
  component: StorefrontProductGrid,
  parameters: { layout: "padded" },
  args: {
    products,
    productHref: (slug: string) => `/lessari/produtos/${slug}`,
    locale: "pt-BR",
    title: "Lançamentos",
    seeAllHref: "/lessari/produtos",
  },
  decorators: [
    (Story) => (
      <div style={{ "--shop-primary": "oklch(0.55 0.18 25)" } as CSSProperties}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StorefrontProductGrid>

export default meta
type Story = StoryObj<typeof meta>

/** Quatro por fileira, o padrão de quem não escolheu. */
export const QuatroColunas: Story = {}

/** Seis, numa célula larga; na estreita, as colunas diminuem sozinhas. */
export const SeisColunas: Story = { args: { columns: 6 } }

/** Numa célula de um terço: três colunas pedidas, duas desenhadas, porque o espaço não comporta mais. */
export const NumTerco: Story = {
  args: { columns: 3, title: "Mais vendidos" },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
}
