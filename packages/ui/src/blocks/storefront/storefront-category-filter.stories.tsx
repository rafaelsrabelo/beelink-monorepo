import type { Meta, StoryObj } from "@storybook/react-vite"

import { StorefrontCategoryFilter } from "./storefront-category-filter"

const meta = {
  title: "Blocos/Vitrine/Filtro de categoria",
  component: StorefrontCategoryFilter,
  parameters: { layout: "padded" },
  args: { locale: "pt-BR" },
} satisfies Meta<typeof StorefrontCategoryFilter>

export default meta
type Story = StoryObj<typeof meta>

/** Numa categoria: a volta, a categoria em negrito e as filhas com contagem. */
export const NaCategoria: Story = {
  args: {
    back: { label: "Todos os produtos", href: "#" },
    current: "Pré-treino",
    entries: [
      { slug: "dose-unica", label: "Dose única", href: "#", count: 12 },
      { slug: "pote", label: "Pote", href: "#", count: 38 },
    ],
  },
}

/** No catálogo e na busca: o primeiro nível, com a categoria escolhida em negrito. */
export const NoCatalogo: Story = {
  args: {
    entries: [
      { slug: "whey", label: "Whey", href: "#", count: 24, selected: true },
      { slug: "creatina", label: "Creatina", href: "#", count: 9 },
    ],
  },
}
