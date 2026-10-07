// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCartCoupons } from "./storefront-cart-coupons"

const coupons = [
  { code: "DEZ", benefit: "10% de desconto", conditions: [], missing: null },
  { code: "PRIMEIRA10", benefit: "10% de desconto", conditions: ["Pedido mínimo de R$ 50,00", "Só no primeiro pedido"], missing: null },
  { code: "FRETEGRATIS", benefit: "Frete grátis", conditions: [], missing: null },
]

const meta = {
  title: "Blocos/Vitrine/Carrinho · cupons disponíveis",
  component: StorefrontCartCoupons,
  parameters: { layout: "centered" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), width: 380 }}>{Story()}</div>],
  args: { coupons, onApply: () => {} },
} satisfies Meta<typeof StorefrontCartCoupons>

export default meta
type Story = StoryObj<typeof meta>

/** Os cupons que a loja mostra e que valem para este carrinho, cada um com "Aplicar". */
export const Padrao: Story = {}

/** O cupom em vigor fica marcado e não é oferecido de novo. */
export const ComUmAplicado: Story = { args: { applied: "DEZ" } }

/** Abaixo do mínimo: diz quanto falta, sem botão — apertar seria recusado. */
export const AbaixoDoMinimo: Story = {
  args: { coupons: [...coupons, { code: "ACIMA150", benefit: "R$ 20,00 de desconto", conditions: ["Pedido mínimo de R$ 150,00"], missing: "Faltam R$ 60,00 em produtos para usar." }] },
}

/** Enquanto um código é conferido, ou o pedido está indo: nada é apertado. */
export const Ocupado: Story = { args: { disabled: true } }

/** Sem cupom mostrado, a seção não é desenhada. */
export const SemCupons: Story = { args: { coupons: [] } }
