import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCartCheckoutCall } from "./storefront-cart-checkout-call"

const meta = {
  title: "Blocos/Vitrine/Carrinho · finalizar compra",
  component: StorefrontCartCheckoutCall,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 360 }}>{Story()}</div>],
  args: { href: "#" },
} satisfies Meta<typeof StorefrontCartCheckoutCall>

export default meta
type Story = StoryObj<typeof meta>

/** Com o parcelamento no cartão, sobre o aviso do frete e o botão. */
export const Padrao: Story = { args: { installments: "em até 6x de R$ 19,96 sem juros" } }

/** Tudo esgotado: não há checkout para onde ir. */
export const SemNadaParaPedir: Story = { args: { disabled: true } }
