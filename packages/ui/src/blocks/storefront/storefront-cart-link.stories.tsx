import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCartLink } from "./storefront-cart-link"

const meta = {
  title: "Blocos/Vitrine/Carrinho do cabeçalho",
  component: StorefrontCartLink,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), backgroundColor: "var(--shop-header)", color: "var(--shop-on-header)", padding: 16 }}>
        {Story()}
      </div>
    ),
  ],
  args: { href: "#" },
} satisfies Meta<typeof StorefrontCartLink>

export default meta
type Story = StoryObj<typeof meta>

export const Vazio: Story = {}

/** Com itens: o selo na cor da marca contra o cabeçalho. */
export const ComItens: Story = { args: { count: 3 } }
