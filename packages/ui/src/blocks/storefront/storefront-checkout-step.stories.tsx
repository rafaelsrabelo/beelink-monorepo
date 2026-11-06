import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCheckoutStep } from "./storefront-checkout-step"

const meta = {
  title: "Blocos/Vitrine/Etapa do checkout",
  component: StorefrontCheckoutStep,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 360 }}>{Story()}</div>],
  args: { step: 2, total: 3, title: "Entrega", state: "open", children: <p className="text-sm">Os campos da etapa.</p> },
} satisfies Meta<typeof StorefrontCheckoutStep>

export default meta
type Story = StoryObj<typeof meta>

/** Aberta: os campos dela. */
export const Aberta: Story = {}

/** Concluída: uma linha com o que foi escolhido e "Alterar". */
export const Concluida: Story = {
  args: {
    state: "done",
    summary: (
      <>
        <p>Entregar em Rua Tibúrcio Cavalcante, 1200 — Fortaleza/CE</p>
        <p className="text-xs text-shop-muted">R$ 8,00 · chega em 30–50 min</p>
      </>
    ),
    edit: <button type="button" className="text-sm font-semibold text-shop-primary-ink">Alterar</button>,
  },
}

/** Fechada: o que fazer antes. */
export const Fechada: Story = { args: { step: 3, title: "Pagamento", state: "locked", hint: "Escolha como receber para continuar." } }
