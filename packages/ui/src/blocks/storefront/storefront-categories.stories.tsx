import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
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
  // The bar is painted on the header, so it is dressed as the masthead would dress it.
  decorators: [
    (Story) => (
      <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), backgroundColor: "var(--shop-header)", color: "var(--shop-on-header)" }}>
        <Story />
      </div>
    ),
  ],
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

/** Na página de um produto: a categoria dele sublinhada, e "Ofertas do dia" no fim. */
export const MarcadaComOfertas: Story = {
  args: { marked: "novidades", offersHref: "/lessari/produtos?desconto=1" },
}

/** The row of photographs, for a shop that has photographed its categories. */
export const EmTiles: Story = {
  args: { variant: "tiles" },
}

/**
 * No photograph anywhere — which is every real shop today, because there is no panel screen for
 * categories yet. The initial on the shop's own colour, never an empty grey circle.
 */
export const TilesSemFotos: Story = {
  args: {
    variant: "tiles",
    categories: categories.map((category) => ({ ...category, imageUrl: null })),
  },
}
