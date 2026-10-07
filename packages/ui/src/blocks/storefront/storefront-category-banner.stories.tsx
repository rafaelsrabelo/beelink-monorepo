import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { categoryBannerArt } from "./category-art.fixtures"
import { StorefrontCategoryBanner } from "./storefront-category-banner"

const meta = {
  title: "Blocos/Vitrine/Banner da categoria",
  component: StorefrontCategoryBanner,
  parameters: { layout: "padded" },
  args: { imageUrl: categoryBannerArt("Ferramentas Elétricas", "seagreen") },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
} satisfies Meta<typeof StorefrontCategoryBanner>

export default meta
type Story = StoryObj<typeof meta>

/** A arte no tamanho recomendado, 1600 × 400 px: aparece inteira. */
export const Padrao: Story = {}

/** No celular a moldura tem a mesma proporção: a arte encolhe, não é cortada. */
export const NoCelular: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
}

/** Um arquivo fora da proporção cobre a moldura e perde as bordas — as mesmas em toda tela. */
export const ForaDaProporcao: Story = {
  args: { imageUrl: "https://picsum.photos/seed/banner/1200/800" },
}
