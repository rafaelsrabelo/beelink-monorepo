import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAccountMenu } from "./storefront-account-menu"
import { StorefrontAccountOutcome } from "./storefront-account-outcome"
import { StorefrontAccountShell } from "./storefront-account-shell"
import { StorefrontReviewCard, type StorefrontReviewCardProps } from "./storefront-review-card"
import { StorefrontReviewForm } from "./storefront-review-form"
import { StorefrontReviewsEmpty } from "./storefront-reviews-empty"
import { StorefrontReviewsSkeleton } from "./storefront-reviews-skeleton"

const pending: StorefrontReviewCardProps[] = [
  { id: "avaliar-creatina", name: "Creatina Monohidratada 300g", href: "#", imageUrl: null, meta: "Entregue em 12 set · Sem sabor", form: <StorefrontReviewForm action="#" hidden={{}} idPrefix="creatina" submitLabel="Enviar avaliação" /> },
  { id: "avaliar-coqueteleira", name: "Coqueteleira Mutante 700ml", href: "#", imageUrl: null, meta: "Entregue em 12 set · Cor: Preta", form: <StorefrontReviewForm action="#" hidden={{}} idPrefix="coqueteleira" submitLabel="Enviar avaliação" /> },
]

const sent: StorefrontReviewCardProps[] = [
  {
    id: "avaliar-haze",
    name: "Pré-Treino Haze Hardcore 300g",
    href: "#",
    imageUrl: null,
    meta: "Sabor: Frutas vermelhas",
    rating: 5,
    comment: "Dá energia sem aquela coceira. Comprarei de novo.",
    form: <StorefrontReviewForm action="#" hidden={{}} idPrefix="haze" rating={5} comment="Dá energia sem aquela coceira. Comprarei de novo." submitLabel="Salvar avaliação" />,
  },
  {
    id: "avaliar-whey",
    name: "Whey Protein Isolado 900g",
    href: "#",
    imageUrl: null,
    meta: "Sabor: Chocolate",
    rating: 2,
    comment: "Chegou com o lacre aberto.",
    hidden: true,
    form: <StorefrontReviewForm action="#" hidden={{}} idPrefix="whey" rating={2} comment="Chegou com o lacre aberto." submitLabel="Salvar avaliação" />,
  },
]

const menu = (
  <StorefrontAccountMenu
    shopper={{ name: "Rafael Souza", contact: "(85) 99999-4321" }}
    items={[
      { key: "overview", href: "#" },
      { key: "orders", href: "#", count: 1 },
      { key: "favorites", href: "#", count: 12 },
      { key: "reviews", href: "#", count: 2 },
      { key: "profile", href: "#" },
    ]}
    current="reviews"
    signOutAction="#"
  />
)

/** The tab as the area draws it (6c): what arrived to rate, then what was rated. */
function ReviewsTab({ toRate, rated }: { toRate: readonly StorefrontReviewCardProps[]; rated: readonly StorefrontReviewCardProps[] }) {
  return (
    <StorefrontAccountShell menu={menu} page={{ kind: "tab", title: "Avaliar compras", backHref: "#" }}>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-extrabold">Para avaliar</h2>
          {toRate.map((card) => (
            <StorefrontReviewCard key={card.id} {...card} />
          ))}
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-extrabold">Suas avaliações</h2>
          {rated.map((card) => (
            <StorefrontReviewCard key={card.id} {...card} />
          ))}
        </section>
      </div>
    </StorefrontAccountShell>
  )
}

const meta = {
  title: "Blocos/Vitrine/Avaliar compras",
  component: ReviewsTab,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), padding: "0 32px" }}>{Story()}</div>],
  args: { toRate: pending, rated: sent },
} satisfies Meta<typeof ReviewsTab>

export default meta
type Story = StoryObj<typeof meta>

/** 6c: dois produtos para avaliar, e duas avaliações enviadas — uma oculta pela loja. */
export const Lista: Story = {}

/** Vindo do "Avaliar produto" de um pedido: a edição daquele produto já aberta. */
export const EdicaoAberta: Story = { args: { toRate: [], rated: [{ ...sent[0]!, open: true }] } }

/** Depois de enviar: a frase acima das seções. */
export const Enviada: Story = { render: () => <StorefrontAccountOutcome tone="done" message="Avaliação enviada. Obrigado!" /> }

/** Nada entregue ainda: a porta para os pedidos. */
export const Vazia: Story = { render: () => <StorefrontReviewsEmpty variant="none" href="#" /> }

/** A leitura falhou: nunca "nada para avaliar". */
export const Indisponivel: Story = { render: () => <StorefrontReviewsEmpty variant="unavailable" href="#" /> }

/** A aba a caminho. */
export const Esqueleto: Story = { render: () => <StorefrontReviewsSkeleton /> }
