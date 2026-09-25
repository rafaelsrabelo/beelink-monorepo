// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontDiscountBadge } from "./storefront-price"
import { StorefrontProductGallery } from "./storefront-product-gallery"

const photos = (count: number) =>
  Array.from({ length: count }, (_, at) => ({ id: String(at + 1), url: `https://picsum.photos/seed/haze-${at + 1}/1200/1200`, alt: at === 0 ? "De frente" : null }))

const meta = {
  title: "Blocos/Vitrine/Galeria do produto",
  component: StorefrontProductGallery,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 540 }}>{Story()}</div>],
  args: { name: "Pré-Treino Haze Hardcore 300g", images: photos(3) },
} satisfies Meta<typeof StorefrontProductGallery>

export default meta
type Story = StoryObj<typeof meta>

/** As miniaturas em coluna ao lado da foto (numa tela larga), zoom sob o cursor e tela cheia no clique. */
export const Padrao: Story = {}

/** Oito fotos: cinco miniaturas e "+3", que abre a tela cheia na sexta. */
export const OitoFotos: Story = { args: { images: photos(8) } }

/** Com o desconto no canto da foto, como a página o desenha. */
export const ComDesconto: Story = {
  args: { images: photos(4), badge: <StorefrontDiscountBadge priceCents={11990} compareAtPriceCents={14990} placement="photo" /> },
}

/** Uma foto só: sem miniaturas. */
export const UmaFoto: Story = { args: { images: photos(1) } }

export const SemFoto: Story = { args: { images: [] } }
