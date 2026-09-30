import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAccountMenu } from "./storefront-account-menu"
import { StorefrontAccountShell } from "./storefront-account-shell"
import { StorefrontCardCartButton } from "./storefront-card-cart-button"
import { StorefrontFavoriteCard, type StorefrontFavoriteCardProps } from "./storefront-favorite-card"
import { StorefrontFavoritesEmpty } from "./storefront-favorites-empty"
import { StorefrontFavoritesHint } from "./storefront-favorites-hint"
import { StorefrontFavoritesOutcome } from "./storefront-favorites-outcome"
import { StorefrontFavoritesSkeleton } from "./storefront-favorites-skeleton"
import { StorefrontFavoritesSort } from "./storefront-favorites-sort"
import { StorefrontOrderTabs } from "./storefront-order-tabs"

const remove = { action: "#", fields: { produto: "p", retorno: "/mutante/conta/favoritos" } }

const card = (overrides: Partial<StorefrontFavoriteCardProps>): StorefrontFavoriteCardProps => ({
  name: "Whey Protein Isolado 900g",
  href: "#",
  imageUrl: null,
  variantLabel: "Sabor: Chocolate",
  priceCents: 18990,
  beforeCents: null,
  dropCents: 0,
  likedOn: "15 set",
  soldOut: false,
  action: <StorefrontCardCartButton name="Whey Protein Isolado 900g" hasOptions={false} onAdd={() => {}} />,
  remove,
  locale: "pt-BR",
  ...overrides,
})

const cards: StorefrontFavoriteCardProps[] = [
  card({ name: "Pré-Treino Haze Hardcore 600g", variantLabel: "Sabor: Frutas vermelhas", priceCents: 20990, beforeCents: 23990, dropCents: 3000, likedOn: "18 set" }),
  card({}),
  card({ name: "Beta-Alanina 200g", variantLabel: null, priceCents: 8990, beforeCents: 10990, likedOn: "1 set", action: <StorefrontCardCartButton name="Beta-Alanina 200g" hasOptions /> }),
  card({ name: "Pré-Treino Haze Hardcore 300g", variantLabel: "Sabor: Maçã verde", priceCents: 11990, likedOn: "4 set", soldOut: true }),
]

const filters = [
  { label: "Todos", count: 12, href: "#", current: true },
  { label: "Baixou de preço", count: 2, href: "#", current: false },
  { label: "Em promoção", count: 3, href: "#", current: false },
  { label: "Esgotados", count: 1, href: "#", current: false },
]

const orders = [
  { value: "recentes", label: "Curtidos recentemente" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-desconto", label: "Maior desconto" },
]

const menu = (
  <StorefrontAccountMenu
    shopper={{ name: "Rafael Souza", contact: "(85) 99999-4321" }}
    items={[
      { key: "overview", href: "#" },
      { key: "orders", href: "#", count: 1 },
      { key: "favorites", href: "#", count: 12 },
      { key: "profile", href: "#" },
    ]}
    current="favorites"
    signOutAction="#"
  />
)

const sort = <StorefrontFavoritesSort action="#" name="ordem" value="recentes" orders={orders} />

/** The tab as the area draws it (6g): the order beside the title, then the filters and a grid of favourites. */
function FavoritesTab({ favorites }: { favorites: readonly StorefrontFavoriteCardProps[] }) {
  return (
    <StorefrontAccountShell menu={menu} page={{ kind: "tab", title: "Favoritos", backHref: "#", tools: sort }}>
      <div className="flex flex-col gap-5">
        <StorefrontFavoritesHint on settingsHref="#" />
        <StorefrontOrderTabs label="Filtrar favoritos" tabs={filters} />
        <ul className="grid grid-cols-2 gap-4 shop-md:grid-cols-3 shop-lg:grid-cols-4">
          {favorites.map((favorite) => (
            <li key={favorite.name}>
              <StorefrontFavoriteCard {...favorite} />
            </li>
          ))}
        </ul>
      </div>
    </StorefrontAccountShell>
  )
}

const meta = {
  title: "Blocos/Vitrine/Favoritos",
  component: FavoritesTab,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), padding: "0 32px" }}>{Story()}</div>],
  args: { favorites: cards },
} satisfies Meta<typeof FavoritesTab>

export default meta
type Story = StoryObj<typeof meta>

/** 6g: baixou de preço, sem mudança, com opções e esgotado. */
export const Lista: Story = {}

/** Nunca curtiu nada: o convite e a porta para a vitrine. */
export const SemFavoritos: Story = { render: () => <StorefrontFavoritesEmpty variant="none" href="#" /> }

/** O filtro não achou nada: a frase e o caminho para ver todos. */
export const SemResultados: Story = { render: () => <StorefrontFavoritesEmpty variant="filtered" href="#" /> }

/** A leitura falhou: nunca "nenhum favorito", e sim o erro e o tentar de novo. */
export const Indisponivel: Story = { render: () => <StorefrontFavoritesEmpty variant="unavailable" href="#" /> }

/** Os avisos de favoritos desligados: a frase e o caminho para ligar. */
export const AvisosDesligados: Story = { render: () => <StorefrontFavoritesHint on={false} settingsHref="#" /> }

/** Depois do coração de um card: o que aconteceu, já que o card simplesmente some. */
export const Removido: Story = { render: () => <StorefrontFavoritesOutcome tone="done" message="Produto removido dos favoritos." /> }

/** A remoção não passou: o motivo, como alerta. */
export const RemocaoRecusada: Story = { render: () => <StorefrontFavoritesOutcome tone="failed" message="Sua sessão já tinha terminado, e nada foi feito. Entre de novo e tente outra vez." /> }

/** A lista a caminho: os filtros e os cards em cinza. */
export const Esqueleto: Story = {
  render: () => (
    <StorefrontAccountShell menu={menu} page={{ kind: "tab", title: "Favoritos", backHref: "#", tools: sort }}>
      <StorefrontFavoritesSkeleton />
    </StorefrontAccountShell>
  ),
}

/** No celular a grade fica com duas colunas e a ordem desce para baixo do título. */
export const Celular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }
