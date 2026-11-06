import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCartLink } from "./storefront-cart-link"
import { StorefrontCheckoutBar } from "./storefront-checkout-bar"

const meta = {
  title: "Blocos/Vitrine/Checkout · barra",
  component: StorefrontCheckoutBar,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { name: "Mutante Suplementos", homeHref: "#", cart: <StorefrontCartLink href="#" count={3} /> },
} satisfies Meta<typeof StorefrontCheckoutBar>

export default meta
type Story = StoryObj<typeof meta>

/** Loja sem logo: o nome no lugar dela. */
export const SemLogo: Story = {}

/** Com a logo, na cor do topo da loja, como o cabeçalho. */
export const ComLogo: Story = { args: { logoUrl: "https://picsum.photos/seed/logo/240/72" } }
