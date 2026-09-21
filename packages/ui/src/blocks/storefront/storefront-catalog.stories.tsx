import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontCatalog } from "./storefront-catalog"

const products = [
  { id: "p1", slug: "bolsa-amora", name: "Bolsa Amora", priceCents: 18900, compareAtPriceCents: 24900, imageUrl: "https://picsum.photos/seed/a/600/600" },
  { id: "p2", slug: "bolsa-serena", name: "Bolsa Serena", priceCents: 22500, compareAtPriceCents: null, imageUrl: "https://picsum.photos/seed/b/600/600" },
  { id: "p3", slug: "necessaire-luna", name: "Necessaire Luna", priceCents: 8900, compareAtPriceCents: 11900, imageUrl: "https://picsum.photos/seed/c/600/600" },
  { id: "p4", slug: "chaveiro-flor", name: "Chaveiro Flor", priceCents: 2500, compareAtPriceCents: null, imageUrl: null },
]

const meta = {
  title: "Blocos/Vitrine/Grade de produtos",
  component: StorefrontCatalog,
  parameters: { layout: "padded" },
  args: {
    products,
    productHref: (slug: string) => `/lessari/produtos/${slug}`,
    locale: "pt-BR",
  },
} satisfies Meta<typeof StorefrontCatalog>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** Two per row, which is what a phone gets and what a shop with four things wants everywhere. */
export const DuasPorLinha: Story = {
  args: { productsPerRow: 2, products: products.slice(0, 2) },
}

export const QuatroPorLinha: Story = {
  args: { productsPerRow: 4 },
}

/** Nothing matched: a sentence and a door, never a blank page. */
export const SemResultado: Story = {
  args: { products: [], clearHref: "/lessari" },
}

/** A shop that quotes instead of pricing — the numbers come off, the catalogue stays. */
export const SemPrecos: Story = {
  args: { showPrice: false },
}
