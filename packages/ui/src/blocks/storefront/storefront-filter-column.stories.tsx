import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCategoryFilter } from "./storefront-category-filter"
import { StorefrontFilterColumn } from "./storefront-filter-column"

const meta = {
  title: "Blocos/Vitrine/Coluna de filtros",
  component: StorefrontFilterColumn,
  parameters: { layout: "padded", viewport: { defaultViewport: "desktop" } },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), backgroundColor: "var(--shop-canvas)", padding: 20 }}>{Story()}</div>],
} satisfies Meta<typeof StorefrontFilterColumn>

export default meta
type Story = StoryObj<typeof meta>

/** A coluna de 5a numa categoria, com dois filtros aplicados. Aparece a partir de `shop-lg`. */
export const NaCategoria: Story = {
  args: {
    chips: [
      { label: "R$ 100 a R$ 200", href: "#preco" },
      { label: "300 g", href: "#peso" },
    ],
    clearHref: "#",
    children: (
      <StorefrontCategoryFilter
        back={{ label: "Todos os produtos", href: "#" }}
        current="Pré-treino"
        entries={[
          { slug: "dose-unica", label: "Dose única", href: "#", count: 12 },
          { slug: "pote", label: "Pote", href: "#", count: 38 },
          { slug: "hardcore", label: "Hardcore", href: "#", count: 21 },
        ]}
        locale="pt-BR"
      />
    ),
  },
}

/** Sem filtro aplicado: sem chips e sem "Limpar tudo". */
export const SemFiltros: Story = {
  args: {
    children: (
      <StorefrontCategoryFilter
        entries={[
          { slug: "whey", label: "Whey", href: "#", count: 24 },
          { slug: "creatina", label: "Creatina", href: "#", count: 9, selected: true },
        ]}
        locale="pt-BR"
      />
    ),
  },
}
