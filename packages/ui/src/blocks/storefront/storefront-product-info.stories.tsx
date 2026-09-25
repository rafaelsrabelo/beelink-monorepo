import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontPrice } from "./storefront-price"
import { StorefrontProductInfo } from "./storefront-product-info"

const meta = {
  title: "Blocos/Vitrine/Produto · coluna de informações",
  component: StorefrontProductInfo,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 452 }}>{Story()}</div>],
  args: {
    shopName: "Mutante Suplementos",
    homeHref: "#",
    name: "Pré-Treino Haze Hardcore 300g — Energia, Foco e Performance",
    unavailable: false,
    price: <StorefrontPrice priceCents={11990} compareAtPriceCents={14990} locale="pt-BR" size="product" />,
  },
} satisfies Meta<typeof StorefrontProductInfo>

export default meta
type Story = StoryObj<typeof meta>

const HAZE = [
  "Pré-treino para quem treina pesado.",
  "",
  "- **Mais energia** para treinos intensos do começo ao fim.",
  "- **Foco total** para manter a cabeça no treino.",
  "- **Sabor incrível**, fácil de misturar na coqueteleira.",
].join("\n")

/** A coluna do meio de 5b: a loja, o título, o preço e "Sobre este item", com as divisórias. */
export const Padrao: Story = { args: { description: HAZE } }

/** A descrição sem lista: nada de "Sobre este item", e a última divisória vai junto. */
export const SemListaNaDescricao: Story = { args: { description: "Pré-treino para quem treina pesado." } }

export const Esgotado: Story = { args: { unavailable: true } }
