import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontOrderSent } from "./storefront-order-sent"

const meta = {
  title: "Blocos/Vitrine/Pedido enviado",
  component: StorefrontOrderSent,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { href: "#", continueHref: "#" },
} satisfies Meta<typeof StorefrontOrderSent>

export default meta
type Story = StoryObj<typeof meta>

/** O carrinho depois de o pedido ir para o WhatsApp. */
export const Padrao: Story = {}
