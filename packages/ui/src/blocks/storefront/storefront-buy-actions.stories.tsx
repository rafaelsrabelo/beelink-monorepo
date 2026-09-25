// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontBuyActions } from "./storefront-buy-actions"

const meta = {
  title: "Blocos/Vitrine/Compra do produto",
  component: StorefrontBuyActions,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 278 }}>{Story()}</div>],
  args: { name: "100% Whey Protein", qty: 1, onQtyChange: () => {}, added: false, onAdd: () => {}, cartHref: "#" },
  render: (args) => {
    const [qty, setQty] = useState(args.qty)
    const [added, setAdded] = useState(args.added)
    return <StorefrontBuyActions {...args} qty={qty} onQtyChange={setQty} added={added} onAdd={() => setAdded(true)} />
  },
} satisfies Meta<typeof StorefrontBuyActions>

export default meta
type Story = StoryObj<typeof meta>

/** "Quantidade", "Adicionar ao carrinho" e "Comprar agora", como na caixa de 5b. */
export const Padrao: Story = {}

export const Adicionado: Story = { args: { added: true } }
