import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCartTotals } from "./storefront-cart-totals"
import { StorefrontCheckoutSummary } from "./storefront-checkout-summary"

const meta = {
  title: "Blocos/Vitrine/Checkout · resumo",
  component: StorefrontCheckoutSummary,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 420 }}>{Story()}</div>],
  args: {
    locale: "pt-BR",
    count: 3,
    amount: "R$ 547,00",
    editHref: "#",
    rows: [
      { key: "top", name: "Top Fitness Preto com Alças Finas", href: "#", variantLabel: "Cor: Preto · Tamanho: M", imageUrl: "https://picsum.photos/seed/top/200/200", unitPriceCents: 12900, qty: 1, lineTotalCents: 12900, wasCents: 17900, available: true },
      { key: "calca", name: "Calça Fitness Azul Claro Cintura Alta", href: "#", variantLabel: "Cor: Azul Claro · Tamanho: M", imageUrl: "https://picsum.photos/seed/calca/200/200", unitPriceCents: 18900, qty: 1, lineTotalCents: 18900, available: true },
      { key: "macacao", name: "Macaquinho Fitness", href: "#", variantLabel: "Cor: Verde · Tamanho: P", imageUrl: null, unitPriceCents: 22900, qty: 1, lineTotalCents: 22900, available: true },
    ],
    children: <StorefrontCartTotals subtotalCents={54700} count={3} delivery="Grátis" locale="pt-BR" />,
  },
} satisfies Meta<typeof StorefrontCheckoutSummary>

export default meta
type Story = StoryObj<typeof meta>

/** Fechado no celular, "Resumo (3) R$ 547,00 ›"; aberto de lado a partir de `shop-lg`. */
export const Padrao: Story = {}

/** Primeiro preço sendo pedido: o valor da linha fechada espera. */
export const Precificando: Story = { args: { pricing: true } }
