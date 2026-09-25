import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontBuyActions } from "./storefront-buy-actions"
import { StorefrontProductBuy } from "./storefront-product-buy"

const meta = {
  title: "Blocos/Vitrine/Produto · coluna de compra",
  component: StorefrontProductBuy,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), width: 320 }}>{Story()}</div>],
  args: { children: <StorefrontBuyActions name="Pré-Treino Haze" qty={1} onQtyChange={() => {}} added={false} onAdd={() => {}} cartHref="#" /> },
} satisfies Meta<typeof StorefrontProductBuy>

export default meta
type Story = StoryObj<typeof meta>

/** A moldura da caixa de compra de 5b: fica visível sob o cabeçalho ao rolar, numa tela larga e alta. */
export const Padrao: Story = {}
