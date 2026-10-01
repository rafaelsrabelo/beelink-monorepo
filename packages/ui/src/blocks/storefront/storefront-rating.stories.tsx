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

/** A média, as estrelas e a contagem como link para a seção: o teclado chega nele, e o leitor ouve a nota. */
export const NoCard: Story = {}

/** Na página do produto, abaixo do título: um pouco maior, a média em negrito. */
export const NoProduto: Story = { args: { size: "product" } }

/** No card de produto, sem link: o card inteiro já leva à página. */
export const Baixa: Story = { args: { average: 2.3, count: 4, reviewsHref: undefined } }

export const UmaAvaliacao: Story = { args: { average: 5, count: 1, reviewsHref: undefined } }
