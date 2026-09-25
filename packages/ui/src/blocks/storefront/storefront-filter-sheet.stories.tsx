import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCategoryFilter } from "./storefront-category-filter"
import { StorefrontFilterSheet } from "./storefront-filter-sheet"
import { StorefrontOptionFilter } from "./storefront-option-filter"

const meta = {
  title: "Blocos/Vitrine/Filtros no celular",
  component: StorefrontFilterSheet,
  parameters: { layout: "padded", viewport: { defaultViewport: "mobile1" } },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
} satisfies Meta<typeof StorefrontFilterSheet>

export default meta
type Story = StoryObj<typeof meta>

/** "Filtrar (2)" abre os grupos da coluna numa folha de baixo; "Ver 12 resultados" fecha. */
export const Padrao: Story = {
  args: {
    applied: 2,
    total: 12,
    locale: "pt-BR",
    children: (
      <>
        <StorefrontCategoryFilter entries={[{ slug: "whey", label: "Whey", href: "#", count: 24 }]} locale="pt-BR" />
        <StorefrontOptionFilter
          title="Sabor"
          values={["Chocolate", "Baunilha", "Morango"].map((label, at) => ({ value: label, label, href: "#", count: 10 - at, selected: at === 0 }))}
          locale="pt-BR"
        />
      </>
    ),
  },
}
