import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAccountOutcome } from "./storefront-account-outcome"
import { StorefrontAccountOverview } from "./storefront-account-overview"
import { StorefrontFavoritesRail, type StorefrontFavoritesRailItem } from "./storefront-favorites-rail"
import { StorefrontOverviewSkeleton } from "./storefront-overview-skeleton"
import { StorefrontQuickRating } from "./storefront-quick-rating"
import { StorefrontReviewCard } from "./storefront-review-card"
import { StorefrontReviewsSection } from "./storefront-reviews-section"

const favorites: StorefrontFavoritesRailItem[] = [
  { productId: "1", href: "#", name: "Whey Protein Isolado 900g", imageUrl: "https://picsum.photos/seed/whey/320/320", priceCents: 16990, dropCents: 2000, soldOut: false },
  { productId: "2", href: "#", name: "Pré-Treino Haze Hardcore 300g", imageUrl: "https://picsum.photos/seed/haze/320/320", priceCents: 11990, dropCents: 0, soldOut: false },
  { productId: "3", href: "#", name: "Creatina Monohidratada 300g", imageUrl: null, priceCents: 9990, dropCents: 1000, soldOut: false },
  { productId: "4", href: "#", name: "Coqueteleira Mutante 700ml", imageUrl: "https://picsum.photos/seed/shaker/320/320", priceCents: 3990, dropCents: 0, soldOut: true },
]

function ToRate() {
  return (
    <StorefrontReviewsSection title="Avalie suas compras" hint="Sua nota ajuda outros clientes. Só quem comprou pode avaliar." aside={<a href="#" className="py-2 text-sm font-semibold text-shop-primary-ink">Ver todos (5)</a>}>
      <div className="grid grid-cols-1 gap-3 shop-md:grid-cols-2">
        {["Creatina Monohidratada 300g", "Coqueteleira Mutante 700ml"].map((name) => (
          <StorefrontReviewCard key={name} id={`avaliar-${name.split(" ")[0]!.toLowerCase()}`} name={name} href="#" imageUrl={null} meta="Entregue em 12 set · Sem sabor" form={<StorefrontQuickRating action="#" hidden={{}} productName={name} />} />
        ))}
      </div>
    </StorefrontReviewsSection>
  )
}

const meta = {
  title: "Blocos/Vitrine/Visão geral da conta",
  component: StorefrontAccountOverview,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="max-w-4xl" style={shopPaletteStyle(sampleColorPresets[2]!.colors)}>{Story()}</div>],
  args: {
    name: "Rafael Souza",
    children: (
      <>
        <ToRate />
        <StorefrontFavoritesRail items={favorites} total={12} dropped={2} allHref="#" locale="pt-BR" />
      </>
    ),
  },
} satisfies Meta<typeof StorefrontAccountOverview>

export default meta
type Story = StoryObj<typeof meta>

/** Como a 6c, abaixo do pedido e dos dados: as compras para avaliar, com as estrelas ali, e o trilho dos favoritos. */
export const ComAvaliacoesEFavoritos: Story = {}

/** Depois de um toque numa estrela: o aviso no topo da seção, com o caminho para escrever um comentário. */
export const NotaEnviada: Story = {
  args: {
    children: (
      <StorefrontReviewsSection title="Avalie suas compras">
        <StorefrontAccountOutcome tone="done" message="Avaliação enviada. Obrigado!" />
      </StorefrontReviewsSection>
    ),
  },
}

/** Enquanto lê: cada parte com o seu esqueleto. */
export const Carregando: Story = {
  args: {
    children: (
      <>
        <StorefrontOverviewSkeleton kind="reviews" />
        <StorefrontOverviewSkeleton kind="favorites" />
      </>
    ),
  },
}
