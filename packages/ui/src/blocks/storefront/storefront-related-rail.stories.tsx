// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCardCartButton } from "./storefront-card-cart-button"
import { StorefrontRelatedRail } from "./storefront-related-rail"
import { StorefrontRelatedSkeleton } from "./storefront-related-skeleton"

const products = (count: number) =>
  Array.from({ length: count }, (_, at) => ({
    id: String(at),
    slug: `produto-${at}`,
    name: ["Pré-Treino Evora 300g", "Creatina Monohidratada 300g", "Beta-Alanina 120 cápsulas"][at % 3]!,
    priceCents: 8990 + at * 700,
    compareAtPriceCents: null,
    imageUrl: `https://picsum.photos/seed/rel-${at}/400/400`,
  }))

const meta = {
  title: "Blocos/Vitrine/Produto · você também pode gostar",
  component: StorefrontRelatedRail,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { products: products(18), productHref: (slug: string) => `#${slug}`, locale: "pt-BR" },
} satisfies Meta<typeof StorefrontRelatedRail>

export default meta
type Story = StoryObj<typeof meta>

/** Dezoito produtos: seis por página numa tela larga, "Página 1 de 3" ao lado do título. */
export const Padrao: Story = {}

/**
 * Com o "+" da loja em cada cartão, sobre o canto da foto: o cartão não fica mais alto. Um produto
 * com opções (aqui, um a cada três) leva "Ver opções", e o toque nele abre a página do produto.
 */
export const ComAdicionar: Story = {
  args: {
    cardAction: (product) => <StorefrontCardCartButton name={product.name} hasOptions={Number(product.id) % 3 === 1} onAdd={() => {}} size="icon" />,
  },
}

/** Quatro produtos: cabem numa página, sem o contador. */
export const Poucos: Story = { args: { products: products(4) } }

/** Enquanto os produtos chegam. */
export const Carregando: Story = { render: () => <StorefrontRelatedSkeleton /> }
