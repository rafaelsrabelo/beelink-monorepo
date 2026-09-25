import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontFilterCheckbox } from "./storefront-filter-checkbox"

const meta = {
  title: "Blocos/Vitrine/Caixa de filtro",
  component: StorefrontFilterCheckbox,
  parameters: { layout: "centered" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { label: "Chocolate", href: "#", count: 24, locale: "pt-BR", selected: false },
} satisfies Meta<typeof StorefrontFilterCheckbox>

export default meta
type Story = StoryObj<typeof meta>

export const Desmarcada: Story = {}

export const Marcada: Story = { args: { selected: true } }
