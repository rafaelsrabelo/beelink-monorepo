import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontReorderButton } from "./storefront-reorder-button"
import { StorefrontReorderNotice } from "./storefront-reorder-notice"

const meta = {
  title: "Blocos/Vitrine/Comprar de novo",
  component: StorefrontReorderNotice,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 720 }}>{Story()}</div>],
  args: { number: 1042, outcome: "added", left: [] },
} satisfies Meta<typeof StorefrontReorderNotice>

export default meta
type Story = StoryObj<typeof meta>

/** No carrinho: tudo entrou, com o preço de hoje. */
export const TudoEntrou: Story = {}

/** Parte ficou de fora, cada item com o motivo. */
export const ParteDeFora: Story = {
  args: { left: ["Pré-Treino Haze 300g (Sabor: Uva) — esgotado", "Coqueteleira 700ml — não está mais à venda", "Creatina 300g — só 1 disponível"] },
}

/** Nada do pedido está à venda agora. */
export const NadaAVenda: Story = { args: { outcome: "none", left: ["Coqueteleira 700ml — não está mais à venda"] } }

/** A leitura do pedido falhou: nada entrou. */
export const Falhou: Story = { args: { outcome: "failed" } }

/** Os dois botões: no cartão e sob os itens do pedido. */
export const Botoes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>
      <StorefrontReorderButton action="#" />
      <StorefrontReorderButton action="#" variant="all" />
    </div>
  ),
}
