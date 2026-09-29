import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { ShopPaletteProvider } from "./shop-palette-context"
import { StorefrontOrderCancel } from "./storefront-order-cancel"

const palette = shopPaletteStyle(sampleColorPresets[2]!.colors)

const meta = {
  title: "Blocos/Vitrine/Cancelar pedido",
  component: StorefrontOrderCancel,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ShopPaletteProvider colors={sampleColorPresets[2]!.colors}>
        <div style={palette}>{Story()}</div>
      </ShopPaletteProvider>
    ),
  ],
  args: { number: 1042, onConfirm: () => {} },
} satisfies Meta<typeof StorefrontOrderCancel>

export default meta
type Story = StoryObj<typeof meta>

/** O botão do cartão; a confirmação abre por cima da página. */
export const Botao: Story = {}

/** O cancelamento a caminho. */
export const Cancelando: Story = { args: { pending: true } }

/** A loja aceitou antes: a recusa, dentro do diálogo. */
export const Recusado: Story = { args: { error: "A loja já aceitou este pedido. Para cancelar, fale com a loja." } }
