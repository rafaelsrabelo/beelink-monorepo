import type { Meta, StoryObj } from "@storybook/react-vite"

import { ReviewFilters } from "./review-filters"
import { ReviewList, type ReviewListRow } from "./review-list"
import { ReviewListSkeleton } from "./review-list-skeleton"
import { ReviewsFailed } from "./reviews-failed"

const rows: ReviewListRow[] = [
  { id: "r1", rating: 5, comment: "Dá energia sem aquela coceira. Comprarei de novo.", productName: "Pré-Treino Haze Hardcore 300g", productHref: "#", customerName: "Bia Souza", date: "30 set 2026", hidden: false },
  { id: "r2", rating: 4, comment: null, productName: "Whey Protein Isolado 900g", productHref: "#", customerName: "Caio Lima", date: "29 set 2026", hidden: false },
  { id: "r3", rating: 1, comment: "Chegou com o lacre aberto e ninguém respondeu.", productName: "Whey Protein Isolado 900g", productHref: "#", customerName: "Duda Reis", date: "27 set 2026", hidden: true },
]

const filters = (
  <ReviewFilters
    statuses={[
      { key: "ALL", label: "Todas", count: 3, href: "#", active: true },
      { key: "PUBLISHED", label: "Publicadas", count: 2, href: "#", active: false },
      { key: "HIDDEN", label: "Ocultas", count: 1, href: "#", active: false },
    ]}
    ratings={[{ rating: null, href: "#", active: true }, ...[5, 4, 3, 2, 1].map((rating) => ({ rating, href: "#", active: false }))]}
    product={null}
  />
)

/** The panel's list as the screen composes it: the filters over a card with the reviews. */
function ReviewsPanel({ rows: shown }: { rows: readonly ReviewListRow[] }) {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {filters}
      <div className="bg-card rounded-xl border">
        <ReviewList rows={shown} empty="none" onToggle={() => {}} />
      </div>
    </div>
  )
}

const meta = {
  title: "Blocos/Painel/Avaliações",
  component: ReviewsPanel,
  args: { rows },
} satisfies Meta<typeof ReviewsPanel>

export default meta
type Story = StoryObj<typeof meta>

/** Três avaliações, uma oculta pela loja. */
export const Lista: Story = {}

/** Filtrada por um produto: o chip e o caminho de volta. */
export const PorProduto: Story = {
  render: () => (
    <ReviewFilters
      statuses={[{ key: "ALL", label: "Todas", count: 2, href: "#", active: true }]}
      ratings={[{ rating: null, href: "#", active: true }]}
      product={{ name: "Whey Protein Isolado 900g", clearHref: "#" }}
    />
  ),
}

/** A loja ainda não tem avaliações. */
export const Vazia: Story = { args: { rows: [] } }

/** Carregando. */
export const Carregando: Story = { render: () => <ReviewListSkeleton /> }

/** A leitura falhou. */
export const Falhou: Story = { render: () => <ReviewsFailed onRetry={() => {}} /> }
