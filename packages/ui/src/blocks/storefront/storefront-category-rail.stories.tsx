import type { CSSProperties } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontCategoryRail } from "./storefront-category-rail"

const categories = [
  { id: "1", slug: "mais-vendidos", name: "Mais vendidos", imageUrl: "https://picsum.photos/seed/mv/600/600", productCount: 12 },
  { id: "2", slug: "novidades", name: "Novidades", imageUrl: "https://picsum.photos/seed/nv/600/600", productCount: 1 },
  { id: "3", slug: "promocoes", name: "Promoções", imageUrl: "https://picsum.photos/seed/pr/600/600", productCount: 37 },
  { id: "4", slug: "acessorios", name: "Acessórios", imageUrl: null, productCount: 8 },
  { id: "5", slug: "calcados", name: "Calçados", imageUrl: null, productCount: 5 },
  { id: "6", slug: "bolsas", name: "Bolsas", imageUrl: "https://picsum.photos/seed/bs/600/600", productCount: 9 },
  { id: "7", slug: "infantil", name: "Infantil", imageUrl: null, productCount: 4 },
]

const meta = {
  title: "Blocos/Vitrine/Trilho de categorias",
  component: StorefrontCategoryRail,
  parameters: { layout: "padded" },
  args: {
    categories,
    href: (slug: string) => `/lessari/categorias/${slug}`,
    label: "Categorias",
  },
  // The initial and the empty state's door borrow the shop's colours, which only a window defines.
  decorators: [
    (Story) => (
      <div style={{ "--shop-primary": "oklch(0.55 0.17 15)", "--shop-background": "oklch(1 0 0)" } as CSSProperties}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StorefrontCategoryRail>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** A phone's width: three cards and a peek of the fourth, which is what says the row goes on. */
export const NoCelular: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
}

/** A shop that never separated what it sells: the same sentence and door as the grid. */
export const SemCategorias: Story = {
  args: { categories: [], catalogHref: "/lessari/produtos" },
}
