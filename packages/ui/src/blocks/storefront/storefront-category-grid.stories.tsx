import type { CSSProperties } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import { artCategories } from "./category-art.fixtures"
import { StorefrontCategoryGrid } from "./storefront-category-grid"

const categories = [
  { id: "1", slug: "mais-vendidos", name: "Mais vendidos", imageUrl: "https://picsum.photos/seed/mv/600/600", productCount: 12 },
  { id: "2", slug: "novidades", name: "Novidades", imageUrl: "https://picsum.photos/seed/nv/600/600", productCount: 1 },
  { id: "3", slug: "promocoes", name: "Promoções", imageUrl: "https://picsum.photos/seed/pr/600/600", productCount: 37 },
  { id: "4", slug: "acessorios", name: "Acessórios", imageUrl: null, productCount: 8 },
]

const meta = {
  title: "Blocos/Vitrine/Grade de categorias",
  component: StorefrontCategoryGrid,
  parameters: { layout: "padded" },
  args: {
    categories,
    href: (slug: string) => `/lessari/categorias/${slug}`,
  },
  // The shop colours are set here because the initial and the empty page's door borrow them, and
  // outside a shop window nothing defines them.
  decorators: [
    (Story) => (
      <div style={{ "--shop-primary": "oklch(0.55 0.17 15)", "--shop-background": "oklch(1 0 0)" } as CSSProperties}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StorefrontCategoryGrid>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/**
 * No photograph anywhere — which is every real shop today, because there is no panel screen for
 * categories yet. The initial on the shop's own colour, never an empty grey square.
 */
export const SemFotos: Story = {
  args: { categories: categories.map((category) => ({ ...category, imageUrl: null })) },
}

export const DuasPorLinha: Story = {
  args: { columns: 2, categories: categories.slice(0, 2) },
}

/** Four where the cell has room for four; widen and narrow the canvas to watch it step down. */
export const QuatroPorLinha: Story = {
  args: { columns: 4 },
}

/**
 * Artwork that already carries its words: a square of the picture and nothing written with it. The
 * one category with no picture ("Jardim") is drawn with its name, never as an empty square.
 */
export const SoAArte: Story = {
  args: { categories: artCategories, cardStyle: "ART_ONLY", columns: 4 },
}

/** Two across, the floor on a phone whatever was chosen. */
export const SoAArteNoCelular: Story = {
  args: { categories: artCategories, cardStyle: "ART_ONLY", columns: 4 },
  globals: { viewport: { value: "mobile2", isRotated: false } },
}

/** A shop that never separated what it sells: a sentence and a door, never a blank page. */
export const SemCategorias: Story = {
  args: { categories: [], catalogHref: "/lessari/produtos" },
}
