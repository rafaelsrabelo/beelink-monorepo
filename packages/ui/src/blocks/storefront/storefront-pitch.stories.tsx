// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Lib
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontPitch } from "./storefront-pitch"

const meta = {
  title: "Blocos/Vitrine/Apresentação da loja",
  component: StorefrontPitch,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[1]!.colors)}>{Story()}</div>],
  args: {
    name: "Padaria da Ana",
    description: "Pães, bolos e café da manhã, feitos no dia e entregues na região.",
    orderHref: "https://wa.me/5585999998888",
  },
} satisfies Meta<typeof StorefrontPitch>

export default meta
type Story = StoryObj<typeof meta>

/** Nome, uma linha e o WhatsApp: a página que uma loja tem antes de arranjar a própria. */
export const Padrao: Story = {}

export const SemWhatsapp: Story = { args: { orderHref: undefined } }
