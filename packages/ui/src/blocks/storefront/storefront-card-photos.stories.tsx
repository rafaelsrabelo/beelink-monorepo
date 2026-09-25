// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontProductCard } from "./storefront-product-card"

const photos = (count: number) => Array.from({ length: count }, (_, at) => `https://picsum.photos/seed/card-${at + 1}/520/460`)

const product = (count: number) => ({
  id: "p1",
  slug: "whey",
  name: "100% Whey Protein Concentrado 900g",
  priceCents: 11990,
  compareAtPriceCents: 14990,
  imageUrl: photos(count)[0] ?? null,
  imageUrls: photos(count),
})

const meta = {
  title: "Blocos/Vitrine/Card · fotos",
  component: StorefrontProductCard,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), width: 259 }}>{Story()}</div>],
  args: { product: product(5), href: "#", locale: "pt-BR" },
} satisfies Meta<typeof StorefrontProductCard>

export default meta
type Story = StoryObj<typeof meta>

/** Cinco fotos: passam com o dedo, com as setas ao passar o mouse, e pelos pontos. */
export const CincoFotos: Story = {}

export const DuasFotos: Story = { args: { product: product(2) } }

/** Uma foto só: nada de setas nem pontos. */
export const UmaFoto: Story = { args: { product: product(1) } }
