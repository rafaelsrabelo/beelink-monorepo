import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontCatalog } from "./storefront-catalog"

const categories = [
  { id: "1", slug: "mais-vendidos", name: "Mais vendidos", imageUrl: "https://picsum.photos/seed/mv/200/200" },
  { id: "2", slug: "novidades", name: "Novidades", imageUrl: "https://picsum.photos/seed/nv/200/200" },
  { id: "3", slug: "promocoes", name: "Promoções", imageUrl: "https://picsum.photos/seed/pr/200/200" },
]

const products = [
  { id: "p1", slug: "bolsa-amora", name: "Bolsa Amora", priceCents: 18900, compareAtPriceCents: 24900, imageUrl: "https://picsum.photos/seed/a/600/600" },
  { id: "p2", slug: "bolsa-serena", name: "Bolsa Serena", priceCents: 22500, compareAtPriceCents: null, imageUrl: "https://picsum.photos/seed/b/600/600" },
  { id: "p3", slug: "necessaire-luna", name: "Necessaire Luna", priceCents: 8900, compareAtPriceCents: 11900, imageUrl: "https://picsum.photos/seed/c/600/600" },
  { id: "p4", slug: "chaveiro-flor", name: "Chaveiro Flor", priceCents: 2500, compareAtPriceCents: null, imageUrl: null },
]

const meta = {
  title: "Blocos/Vitrine/Catálogo",
  component: StorefrontCatalog,
  parameters: { layout: "padded" },
  args: {
    categories,
    products,
    searchAction: "/lessari",
    categoryHref: (slug: string | null) => (slug ? `/lessari?categoria=${slug}` : "/lessari"),
    productHref: (slug: string) => `/lessari/produtos/${slug}`,
    locale: "pt-BR",
  },
} satisfies Meta<typeof StorefrontCatalog>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

/** One category filtering. Every category stays listed — you must be able to get back out. */
export const Filtrado: Story = {
  args: { activeCategory: "promocoes", products: [products[0], products[2]] },
}

export const ComBusca: Story = {
  args: { search: "bolsa", products: [products[0], products[1]] },
}

/** Nothing matched: a sentence and a way back, never a blank page. */
export const SemResultado: Story = {
  args: { search: "guarda-chuva", products: [] },
}

/** A shop with six handmade things, not three hundred SKUs — the median bee-link shop. */
export const LojaPequena: Story = {
  args: { categories: [], products: products.slice(0, 2), productsPerRow: 2 },
}
