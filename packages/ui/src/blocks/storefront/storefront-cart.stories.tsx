import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCart } from "./storefront-cart"

const meta = {
  title: "Blocos/Vitrine/Carrinho",
  component: StorefrontCart,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), backgroundColor: "var(--shop-canvas)", padding: 20 }}>{Story()}</div>],
  args: { locale: "pt-BR", continueHref: "#" },
} satisfies Meta<typeof StorefrontCart>

export default meta
type Story = StoryObj<typeof meta>

/** Duas linhas, uma esgotada que não entra no total. */
export const ComItens: Story = {
  args: {
    subtotalCents: 17980,
    count: 2,
    rows: [
      { key: "whey", name: "100% Whey Protein Concentrado", href: "#", variantLabel: "Sabor: Chocolate · Peso: 900 g", imageUrl: null, unitPriceCents: 8990, qty: 2, lineTotalCents: 17980, available: true },
      { key: "uva", name: "Creatina Monohidratada", href: "#", variantLabel: "Sabor: Uva", imageUrl: null, unitPriceCents: 5990, qty: 1, lineTotalCents: 5990, available: false },
    ],
  },
}

/** Com promoção e cupom: cada um na sua linha, e a linha do carrinho diz o que a promoção tirou. */
export const ComDescontos: Story = {
  args: {
    subtotalCents: 25990,
    count: 3,
    discounts: [
      { key: "promotion", label: "Promoção: Semana do Whey", value: "− R$ 25,00" },
      { key: "coupon", label: "Cupom BEMVINDO10", value: "− R$ 23,49" },
    ],
    total: "R$ 211,41 + frete",
    rows: [
      { key: "whey", name: "100% Whey Protein Concentrado", href: "#", variantLabel: "Sabor: Chocolate · Peso: 900 g", imageUrl: null, unitPriceCents: 8750, qty: 2, lineTotalCents: 17500, wasCents: 20000, promotion: "Semana do Whey", available: true },
      { key: "creatina", name: "Creatina Monohidratada", href: "#", variantLabel: null, imageUrl: null, unitPriceCents: 5990, qty: 1, lineTotalCents: 5990, available: true },
    ],
  },
}

/** A loja cota o frete pela distância (BEELINK-178): a entrega tem a sua linha, e o total a soma. */
export const ComFrete: Story = {
  args: { ...ComItens.args, delivery: "R$ 5,00", total: "R$ 184,80" },
}

/** Visitante: a promoção de primeira compra é anunciada com o valor, e só entra no total quando ele se identifica. */
export const PrimeiraCompraAnunciada: Story = {
  args: { ...ComItens.args, offer: { tone: "open", text: "Boas-vindas: − R$ 26,97 na sua primeira compra. Entre na sua conta para confirmar." } },
}

/** O cashback que o pedido renderia, calculado pela API (BEELINK-243). */
export const ComCashback: Story = {
  args: { ...ComItens.args, cashback: "Você ganha R$ 8,99 de cashback com este pedido, para usar nas próximas compras." },
}

/** Abaixo do pedido mínimo da loja: quanto falta para ganhar. */
export const CashbackFaltaPouco: Story = {
  args: { ...ComItens.args, cashback: "Faltam R$ 20,10 para ganhar 5% de cashback." },
}

/** Cliente que já comprou na loja: a frase diz por que a promoção não é dele. */
export const PrimeiraCompraJaFeita: Story = {
  args: { ...ComItens.args, offer: { tone: "closed", text: "Boas-vindas vale só na primeira compra." } },
}

/** A primeira cotação ainda não chegou: os valores esperam. */
export const Cotando: Story = { args: { ...ComItens.args, pricing: true } }

/** Vazio: uma frase e o caminho de volta. */
export const Vazio: Story = { args: { rows: [], subtotalCents: 0, count: 0 } }
