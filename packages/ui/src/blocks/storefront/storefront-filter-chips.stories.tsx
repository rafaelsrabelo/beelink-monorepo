import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontFilterChips } from "./storefront-filter-chips"

const meta = {
  title: "Blocos/Vitrine/Chips de filtro",
  component: StorefrontFilterChips,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
} satisfies Meta<typeof StorefrontFilterChips>

export default meta
type Story = StoryObj<typeof meta>

/** O que está aplicado, cada chip tira o seu filtro. */
export const Padrao: Story = {
  args: {
    chips: [
      { label: "R$ 100 a R$ 200", href: "#preco" },
      { label: "Em promoção", href: "#desconto" },
      { label: "300 g", href: "#peso" },
    ],
  },
}
