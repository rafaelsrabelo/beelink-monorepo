import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontCategories } from "./storefront-categories"

const categories = [
  { id: "1", slug: "mais-vendidos", name: "Mais vendidos", imageUrl: "https://picsum.photos/seed/mv/200/200" },
  { id: "2", slug: "novidades", name: "Novidades", imageUrl: "https://picsum.photos/seed/nv/200/200" },
  { id: "3", slug: "promocoes", name: "Promoções", imageUrl: "https://picsum.photos/seed/pr/200/200" },
  { id: "4", slug: "acessorios", name: "Acessórios", imageUrl: null },
]

const meta = {
  title: "Blocos/Vitrine/Categorias",
  component: StorefrontCategories,
  parameters: { layout: "padded" },
  args: {
    categories,
    href: (slug: string | null) => (slug ? `/lessari?categoria=${slug}` : "/lessari"),
  },
} satisfies Meta<typeof StorefrontCategories>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const ComUmaAberta: Story = {
  args: { active: "promocoes" },
}

/**
 * No photograph anywhere — which is every real shop today, because there is no panel screen for
 * categories yet. The initial on the shop's own colour, never an empty grey circle.
 */
export const SemFotos: Story = {
  args: { categories: categories.map((category) => ({ ...category, imageUrl: null })) },
}

export const ComoChips: Story = {
  args: { withImages: false },
}
