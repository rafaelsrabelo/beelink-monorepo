import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCardCartButton } from "./storefront-card-cart-button"

const meta = {
  title: "Blocos/Vitrine/Botão do card",
  component: StorefrontCardCartButton,
  parameters: { layout: "centered" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), width: 240 }}>{Story()}</div>],
  args: { name: "Blusa", onAdd: () => {} },
} satisfies Meta<typeof StorefrontCardCartButton>

export default meta
type Story = StoryObj<typeof meta>

/** Produto sem opções: vai direto para o carrinho. */
export const Adicionar: Story = { args: { hasOptions: false } }

/** Produto com opções: a escolha é na página do produto. */
export const ComOpcoes: Story = { args: { hasOptions: true } }
