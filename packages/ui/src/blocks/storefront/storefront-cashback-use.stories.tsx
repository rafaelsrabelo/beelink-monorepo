import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCashbackUse } from "./storefront-cashback-use"

const meta = {
  title: "Blocos/Vitrine/Usar cashback",
  component: StorefrontCashbackUse,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), backgroundColor: "var(--shop-background)", padding: 20, maxWidth: 320 }}>{Story()}</div>
    ),
  ],
  args: { balance: "R$ 15,00", checked: false },
} satisfies Meta<typeof StorefrontCashbackUse>

export default meta
type Story = StoryObj<typeof meta>

/** O cliente tem saldo e ainda não escolheu usar. */
export const Oferecido: Story = {}

/** Marcado: o saldo inteiro entra no pedido. */
export const Usando: Story = { args: { checked: true } }

/** Marcado, mas o pedido aceita menos do que o cliente tem. */
export const ComTeto: Story = { args: { balance: "R$ 80,00", checked: true, cappedAt: "R$ 50,00" } }

/** Os descontos zeraram os produtos: não há o que pagar com o crédito. */
export const SemOQuePagar: Story = { args: { nothingToPay: true } }
