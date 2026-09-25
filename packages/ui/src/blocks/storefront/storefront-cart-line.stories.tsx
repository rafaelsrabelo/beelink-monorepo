import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCartLine } from "./storefront-cart-line"

const meta = {
  title: "Blocos/Vitrine/Linha do carrinho",
  component: StorefrontCartLine,
  parameters: { layout: "padded" },
  decorators: [(Story) => <ul style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 640 }}>{Story()}</ul>],
  args: {
    locale: "pt-BR",
    row: { key: "whey", name: "100% Whey Protein Concentrado", href: "#", variantLabel: "Sabor: Chocolate · Peso: 900 g", imageUrl: null, unitPriceCents: 8990, qty: 2, lineTotalCents: 17980, available: true },
  },
} satisfies Meta<typeof StorefrontCartLine>

export default meta
type Story = StoryObj<typeof meta>

export const Padrao: Story = {}

export const Esgotada: Story = { args: { row: { key: "uva", name: "Creatina", href: "#", variantLabel: "Sabor: Uva", imageUrl: null, unitPriceCents: 5990, qty: 1, lineTotalCents: 5990, available: false } } }
