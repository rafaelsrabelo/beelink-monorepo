import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontBuyActions } from "./storefront-buy-actions"

const meta = {
  title: "Blocos/Vitrine/Compra do produto",
  component: StorefrontBuyActions,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 380 }}>{Story()}</div>],
  args: { name: "100% Whey Protein", onAdd: () => {}, cartHref: "#", orderHref: "#" },
} satisfies Meta<typeof StorefrontBuyActions>

export default meta
type Story = StoryObj<typeof meta>

/** Quantidade, "Adicionar ao carrinho", "Comprar agora" e o pedido pelo WhatsApp embaixo. */
export const Padrao: Story = {}
