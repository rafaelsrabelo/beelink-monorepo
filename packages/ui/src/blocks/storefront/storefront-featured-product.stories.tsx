// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontFeaturedBuy } from "./storefront-featured-buy"
import { StorefrontFeaturedProduct } from "./storefront-featured-product"
import { StorefrontFeaturedSkeleton } from "./storefront-featured-skeleton"

const product = {
  name: "Whey Baunilha 900 g",
  href: "/loja/produtos/whey",
  imageUrl: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=900",
  priceCents: 12990,
  compareAtPriceCents: 15990,
  soldOut: false,
}

const meta = {
  title: "Blocos/Vitrine/Produto em destaque",
  component: StorefrontFeaturedProduct,
  parameters: { layout: "padded" },
  args: {
    layout: "IMAGE_LEFT",
    title: "Oferta relâmpago",
    subtitle: "Estoque limitado",
    product,
    locale: "pt-BR",
    action: <StorefrontFeaturedBuy name={product.name} productHref={product.href} cartHref="/loja/carrinho" hasOptions={false} soldOut={false} onBuy={() => {}} />,
  },
} satisfies Meta<typeof StorefrontFeaturedProduct>

export default meta
type Story = StoryObj<typeof meta>

/** A foto ao lado; título, nome, preço e o botão que põe no carrinho. */
export const ImagemAoLado: Story = {}

/** A foto grande, as palavras embaixo. */
export const ImagemGrande: Story = { args: { layout: "IMAGE_LARGE" } }

/** Esgotado: diz isso, e o botão leva à página do produto, onde está o "Avise-me". */
export const Esgotado: Story = {
  args: {
    product: { ...product, soldOut: true },
    action: <StorefrontFeaturedBuy name={product.name} productHref={product.href} cartHref="/loja/carrinho" hasOptions={false} soldOut />,
  },
}

/** Com variações: "Ver opções" leva à página para escolher. */
export const ComOpcoes: Story = {
  args: { action: <StorefrontFeaturedBuy name={product.name} productHref={product.href} cartHref="/loja/carrinho" hasOptions soldOut={false} /> },
}

/** Enquanto o editor lê o produto escolhido. */
export const Carregando: Story = { render: () => <StorefrontFeaturedSkeleton layout="IMAGE_LEFT" /> }
