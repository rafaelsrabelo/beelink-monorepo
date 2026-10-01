import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontProductReview } from "./storefront-product-review"
import { StorefrontProductReviews } from "./storefront-product-reviews"
import { StorefrontProductReviewsSkeleton } from "./storefront-product-reviews-skeleton"
import { StorefrontReviewSummary } from "./storefront-review-summary"

const rows = ([[5, 78], [4, 14], [3, 5], [2, 1], [1, 2]] as const).map(([stars, percent]) => ({ stars, percent, href: "#", active: false }))

const reviews = [
  <StorefrontProductReview key="1" authorName="Bia S." rating={5} comment="Dá energia sem aquela coceira. Comprarei de novo." variantLabel="Sabor: Frutas vermelhas · Peso: 300 g" date="30 set 2026" />,
  <StorefrontProductReview key="2" authorName="Caio" rating={4} comment={null} variantLabel="Sabor: Limão · Peso: 300 g" date="28 set 2026" />,
]

/** 5b's last section, as the product's page draws it. */
function ProductReviews({ filtered }: { filtered: boolean }) {
  return (
    <StorefrontProductReviews
      summary={<StorefrontReviewSummary average={4.7} count={128} rows={filtered ? rows.map((row) => ({ ...row, active: row.stars === 5 })) : rows} locale="pt-BR" />}
      reviews={reviews}
      {...(filtered ? { allHref: "#" } : {})}
    />
  )
}

const meta = {
  title: "Blocos/Vitrine/Avaliações da página",
  component: ProductReviews,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), padding: "0 32px" }}>{Story()}</div>],
  args: { filtered: false },
} satisfies Meta<typeof ProductReviews>

export default meta
type Story = StoryObj<typeof meta>

/** 5b: o resumo com o histograma, e as avaliações mais novas. */
export const Padrao: Story = {}

/** Filtrada por 5 estrelas: a linha marcada e o caminho para todas. */
export const PorNota: Story = { args: { filtered: true } }

/** Uma nota sem avaliações. */
export const SemNenhuma: Story = { render: () => <StorefrontProductReviews summary={<StorefrontReviewSummary average={4.7} count={128} rows={rows} locale="pt-BR" />} reviews={[]} allHref="#" /> }

/** Carregando. */
export const Carregando: Story = { render: () => <StorefrontProductReviewsSkeleton /> }
