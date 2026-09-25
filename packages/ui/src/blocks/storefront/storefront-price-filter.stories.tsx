import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontPriceFilter } from "./storefront-price-filter"

const meta = {
  title: "Blocos/Vitrine/Filtro de preço",
  component: StorefrontPriceFilter,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), width: 264 }}>{Story()}</div>],
  args: {
    action: "#",
    locale: "pt-BR",
    bounds: { min: 29, max: 349 },
    ranges: [
      { label: "Até R$ 50", href: "#", selected: false },
      { label: "R$ 50 a R$ 100", href: "#", selected: false },
      { label: "R$ 100 a R$ 200", href: "#", selected: true },
      { label: "Acima de R$ 200", href: "#", selected: false },
    ],
    value: { min: 100, max: 200 },
  },
} satisfies Meta<typeof StorefrontPriceFilter>

export default meta
type Story = StoryObj<typeof meta>

/** O "Preço" de 5a: faixas rápidas, o controle de dois polegares e mín./máx. com "Ir". */
export const Padrao: Story = {}

/** Sem faixa aplicada. */
export const SemFaixa: Story = { args: { value: {}, ranges: [{ label: "Até R$ 50", href: "#", selected: false }] } }
