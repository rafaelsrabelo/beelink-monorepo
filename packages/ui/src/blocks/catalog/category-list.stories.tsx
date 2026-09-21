import type { Meta, StoryObj } from "@storybook/react-vite"

import { CategoryList } from "./category-list"

const categories = [
  { id: "1", slug: "proteinas", name: "Proteínas", imageUrl: null, parentSlug: null, productCount: 3, isActive: true },
  { id: "2", slug: "whey", name: "Whey", imageUrl: "https://picsum.photos/seed/w/80/80", parentSlug: "proteinas", productCount: 2, isActive: true },
  { id: "3", slug: "albumina", name: "Albumina", imageUrl: null, parentSlug: "proteinas", productCount: 1, isActive: false },
  { id: "4", slug: "creatina", name: "Creatina", imageUrl: null, parentSlug: null, productCount: 0, isActive: true },
]

const meta = {
  title: "Blocos/Catálogo/Lista de categorias",
  component: CategoryList,
  parameters: { layout: "padded" },
  args: { categories, onEdit: () => {}, onDelete: () => {} },
} satisfies Meta<typeof CategoryList>

export default meta
type Story = StoryObj<typeof meta>

export const ComSubcategorias: Story = {}

/** A loja ainda não separou nada: uma frase e o que fazer. */
export const Vazia: Story = {
  args: { categories: [] },
}
