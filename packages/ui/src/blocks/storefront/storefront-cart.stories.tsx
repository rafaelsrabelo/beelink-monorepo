import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCart } from "./storefront-cart"

const meta = {
  title: "Blocos/Vitrine/Carrinho",
  component: StorefrontCart,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), backgroundColor: "var(--shop-canvas)", padding: 20 }}>{Story()}</div>],
  args: { locale: "pt-BR", continueHref: "#" },
} satisfies Meta<typeof StorefrontCart>

export default meta
type Story = StoryObj<typeof meta>

/** Duas linhas, uma esgotada que não entra no total. */
export const ComItens: Story = {
  args: {
    subtotalCents: 17980,
    count: 2,
    rows: [
      { key: "whey", name: "100% Whey Protein Concentrado", href: "#", variantLabel: "Sabor: Chocolate · Peso: 900 g", imageUrl: null, unitPriceCents: 8990, qty: 2, lineTotalCents: 17980, available: true },
      { key: "uva", name: "Creatina Monohidratada", href: "#", variantLabel: "Sabor: Uva", imageUrl: null, unitPriceCents: 5990, qty: 1, lineTotalCents: 5990, available: false },
    ],
  },
}

/** Com promoção e cupom: cada um na sua linha, e a linha do carrinho diz o que a promoção tirou. */
export const ComDescontos: Story = {
  args: {
    subtotalCents: 25990,
    count: 3,
    discounts: [
      { key: "promotion", label: "Promoção: Semana do Whey", value: "− R$ 25,00" },
      { key: "coupon", label: "Cupom BEMVINDO10", value: "− R$ 23,49" },
    ],
    total: "R$ 211,41 + frete",
    rows: [
      { key: "whey", name: "100% Whey Protein Concentrado", href: "#", variantLabel: "Sabor: Chocolate · Peso: 900 g", imageUrl: null, unitPriceCents: 8750, qty: 2, lineTotalCents: 17500, wasCents: 20000, promotion: "Semana do Whey", available: true },
      { key: "creatina", name: "Creatina Monohidratada", href: "#", variantLabel: null, imageUrl: null, unitPriceCents: 5990, qty: 1, lineTotalCents: 5990, available: true },
    ],
  },
}

/** A primeira cotação ainda não chegou: os valores esperam. */
export const Cotando: Story = { args: { ...ComItens.args, pricing: true } }

/** Vazio: uma frase e o caminho de volta. */
export const Vazio: Story = { args: { rows: [], subtotalCents: 0, count: 0 } }
