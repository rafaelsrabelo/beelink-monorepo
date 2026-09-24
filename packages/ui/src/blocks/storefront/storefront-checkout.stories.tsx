import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCheckout } from "./storefront-checkout"

const meta = {
  title: "Blocos/Vitrine/Fechar pedido",
  component: StorefrontCheckout,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 320 }}>{Story()}</div>],
} satisfies Meta<typeof StorefrontCheckout>

export default meta
type Story = StoryObj<typeof meta>

/** O nome opcional e o botão para o WhatsApp da loja. */
export const Padrao: Story = { args: { hrefFor: () => "#" } }

/** Uma loja sem WhatsApp: nenhum botão, e o porquê. */
export const SemWhatsApp: Story = { args: { hrefFor: null } }
