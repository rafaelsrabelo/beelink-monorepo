import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCardCartButton } from "./storefront-card-cart-button"
import { StorefrontCartUpsell } from "./storefront-cart-upsell"

const products = Array.from({ length: 8 }, (_, at) => ({
  id: String(at),
  slug: `produto-${at}`,
  name: ["Creatina Monohidratada 300g", "Beta-Alanina 120 cápsulas", "Magnésio 360 60 cápsulas", "Vitamina D3 2000 UI"][at % 4]!,
  priceCents: 6990 + at * 700,
  compareAtPriceCents: at % 2 ? 8990 + at * 700 : null,
  imageUrl: `https://picsum.photos/seed/upsell-${at}/400/400`,
  hasOptions: at % 3 === 2,
}))

const meta = {
  title: "Blocos/Vitrine/Carrinho · você também pode gostar",
  component: StorefrontCartUpsell,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: {
    products,
    productHref: (slug: string) => `#${slug}`,
    locale: "pt-BR",
    cardAction: (product) => <StorefrontCardCartButton name={product.name} {...(product.hasOptions !== undefined ? { hasOptions: product.hasOptions } : {})} onAdd={() => {}} />,
  },
} satisfies Meta<typeof StorefrontCartUpsell>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Oito produtos, duas colunas no celular e quatro no computador, cada um com "Adicionar ao
 * carrinho". Um produto com opções leva "Ver opções", e o toque nele abre a página do produto.
 */
export const Padrao: Story = {}
