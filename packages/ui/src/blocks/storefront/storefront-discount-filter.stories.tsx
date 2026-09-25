import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontDiscountFilter } from "./storefront-discount-filter"

const meta = {
  title: "Blocos/Vitrine/Filtro de desconto",
  component: StorefrontDiscountFilter,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), width: 264 }}>{Story()}</div>],
  args: { locale: "pt-BR" },
} satisfies Meta<typeof StorefrontDiscountFilter>

export default meta
type Story = StoryObj<typeof meta>

/** "Em promoção" e as faixas de 5a, a de 20% escolhida. */
export const Padrao: Story = {
  args: {
    onSale: { href: "#", count: 14, selected: false },
    ranges: [
      { percent: 10, href: "#", count: 12, selected: false },
      { percent: 20, href: "#", count: 5, selected: true },
      { percent: 30, href: "#", count: 2, selected: false },
    ],
  },
}
