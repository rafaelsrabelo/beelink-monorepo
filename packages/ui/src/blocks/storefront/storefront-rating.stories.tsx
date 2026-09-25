// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Lib
import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontRating } from "./storefront-rating"

const meta = {
  title: "Blocos/Vitrine/Nota",
  component: StorefrontRating,
  parameters: { layout: "centered" },
  decorators: [(Story) => <div style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: { average: 4.7, count: 128, locale: "pt-BR", reviewsHref: "#avaliacoes" },
} satisfies Meta<typeof StorefrontRating>

export default meta
type Story = StoryObj<typeof meta>

/** No card: a média, as estrelas e a contagem como link. Os dados são exemplo até existirem avaliações. */
export const NoCard: Story = {}

/** Na página do produto: um pouco maior, a média em negrito. */
export const NoProduto: Story = { args: { size: "product" } }

export const Baixa: Story = { args: { average: 2.3, count: 4, reviewsHref: undefined } }
