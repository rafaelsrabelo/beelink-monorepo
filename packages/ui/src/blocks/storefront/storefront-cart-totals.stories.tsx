import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCartTotals } from "./storefront-cart-totals"

const meta = {
  title: "Blocos/Vitrine/Valores do carrinho",
  component: StorefrontCartTotals,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 360, display: "flex", flexDirection: "column", gap: 16 }}>{Story()}</div>],
  args: { locale: "pt-BR", subtotalCents: 25990, count: 3 },
} satisfies Meta<typeof StorefrontCartTotals>

export default meta
type Story = StoryObj<typeof meta>

/** Só o subtotal: nada tirado, nada somado. */
export const Subtotal: Story = {}

/** No checkout: a entrega, o cupom e o total, cada um na sua linha. */
export const NoCheckout: Story = {
  args: { delivery: "R$ 12,00", discounts: [{ key: "coupon", label: "Cupom BEMVINDO10", value: "− R$ 25,99" }], total: "R$ 246,01" },
}

/** No carrinho: sem entrega ainda, o total é uma estimativa. */
export const NoCarrinho: Story = {
  args: { discounts: [{ key: "coupon", label: "Cupom BEMVINDO10", value: "− R$ 25,99" }], total: "R$ 234,01", estimated: true },
}

/** Primeiro preço sendo pedido: os valores esperam como esqueleto. */
export const Precificando: Story = { args: { pricing: true } }
