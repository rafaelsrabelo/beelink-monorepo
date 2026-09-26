// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontCategoryChips } from "./storefront-category-chips"

const meta = {
  title: "Blocos/Vitrine/Categorias em chips",
  component: StorefrontCategoryChips,
  parameters: { layout: "padded" },
  args: {
    categories: [
      { id: "1", slug: "vestidos", name: "Vestidos", imageUrl: null, productCount: 4 },
      { id: "2", slug: "blusas", name: "Blusas", imageUrl: null, productCount: 2 },
      { id: "3", slug: "acessorios", name: "Acessórios", imageUrl: null, productCount: 9 },
      { id: "4", slug: "promocoes", name: "Promoções", imageUrl: null, productCount: 3 },
    ],
    href: (slug: string) => `/loja/categorias/${slug}`,
  },
} satisfies Meta<typeof StorefrontCategoryChips>

export default meta
type Story = StoryObj<typeof meta>

/** Os nomes das categorias, em pílulas que quebram linha. */
export const Chips: Story = {}
