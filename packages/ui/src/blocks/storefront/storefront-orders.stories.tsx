import type { ReactNode } from "react"

import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAccountMenu } from "./storefront-account-menu"
import { StorefrontAccountShell } from "./storefront-account-shell"
import { StorefrontOrderCard, type StorefrontOrderCardProps } from "./storefront-order-card"
import { StorefrontOrderTabs } from "./storefront-order-tabs"
import { StorefrontOrdersEmpty } from "./storefront-orders-empty"
import { StorefrontOrdersSkeleton } from "./storefront-orders-skeleton"
import { StorefrontOrdersToolbar } from "./storefront-orders-toolbar"
import { StorefrontOrdersToolbarSkeleton } from "./storefront-orders-toolbar-skeleton"

const items = [
  { name: "Pré-Treino Haze Hardcore 300g", href: "#", imageUrl: null, meta: "Sabor: Frutas vermelhas · Qtd. 1" },
  { name: "Creatina Monohidratada 300g", href: "#", imageUrl: null, meta: "Sem sabor · Qtd. 1" },
]

const received: StorefrontOrderCardProps = {
  number: 1042,
  placedOn: "21 set 2026",
  total: "R$ 237,22 · Pix",
  saving: "Desconto de R$ 12,48 · cupom BEMVINDO5",
  shipTo: "Rafael Souza",
  headline: "Aguardando a loja confirmar",
  detail: "Feito por você na loja em 21 set, 14:02. A loja confirma o pedido e o prazo.",
  tone: "progress",
  items,
  moreItems: 1,
  actions: (
    <button type="button" className="flex h-10 items-center rounded-full border border-shop-line-strong px-4 text-sm font-semibold">
      Cancelar pedido
    </button>
  ),
}

const delivered: StorefrontOrderCardProps = {
  ...received,
  number: 1031,
  placedOn: "8 set 2026",
  total: "R$ 129,80 · Cartão de crédito",
  headline: "Entregue em 12 set 2026",
  detail: "Feito por você na loja em 8 set, 10:15.",
  tone: "done",
  // Delivered: each line leads to its rating (J18).
  items: items.map((item) => ({ ...item, reviewHref: "#" })),
  moreItems: 0,
  actions: undefined,
}

const cancelled: StorefrontOrderCardProps = {
  ...received,
  number: 1027,
  placedOn: "2 set 2026",
  total: "R$ 69,90 · Dinheiro",
  shipTo: "Retirada na loja",
  headline: "Cancelado em 3 set 2026",
  detail: "Cancelado pela loja · Lançado pela loja em 2 set, 09:00.",
  tone: "cancelled",
  items: items.slice(0, 1),
  moreItems: 0,
  actions: undefined,
}

const tabs = [
  { label: "Todos", count: 4, href: "#", current: true },
  { label: "Em andamento", count: 2, href: "#", current: false },
  { label: "Entregues", count: 1, href: "#", current: false },
  { label: "Cancelados", count: 1, href: "#", current: false },
]

const periods = [
  { value: "", label: "Todo o período" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
]

const menu = (
  <StorefrontAccountMenu
    shopper={{ name: "Rafael Souza", contact: "(85) 99999-4321" }}
    items={[
      { key: "overview", href: "#" },
      { key: "orders", href: "#", count: 2 },
      { key: "profile", href: "#" },
    ]}
    current="orders"
    signOutAction="#"
  />
)

const toolbar = <StorefrontOrdersToolbar action="#" names={{ search: "q", period: "periodo" }} value={{ search: "", period: "" }} periods={periods} />

/** The tab as the area draws it (6d): the title with the search and the period beside it, then the tabs and a card per order. */
function OrdersTab({ cards, tools = toolbar }: { cards: readonly StorefrontOrderCardProps[]; tools?: ReactNode }) {
  return (
    <StorefrontAccountShell menu={menu} page={{ kind: "tab", title: "Meus pedidos", backHref: "#", tools }}>
      <div className="flex flex-col gap-5">
        <StorefrontOrderTabs tabs={tabs} />
        <ul className="flex flex-col gap-4">
          {cards.map((card) => (
            <li key={card.number}>
              <StorefrontOrderCard {...card} />
            </li>
          ))}
        </ul>
      </div>
    </StorefrontAccountShell>
  )
}

const meta = {
  title: "Blocos/Vitrine/Meus pedidos",
  component: OrdersTab,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), padding: "0 32px" }}>{Story()}</div>],
  args: { cards: [received, delivered, cancelled] },
} satisfies Meta<typeof OrdersTab>

export default meta
type Story = StoryObj<typeof meta>

/** 6d: aguardando a loja, entregue e cancelado. */
export const Lista: Story = {}

/** Nunca pediu aqui: uma frase e a porta para as compras. */
export const SemPedidos: Story = { render: () => <StorefrontOrdersEmpty variant="none" href="#" /> }

/** Os filtros não acharam nada: a frase e o caminho para limpar. */
export const SemResultados: Story = { render: () => <StorefrontOrdersEmpty variant="filtered" href="#" /> }

/** A leitura falhou: nunca "nenhum pedido", e sim o erro e o tentar de novo. */
export const Indisponivel: Story = { render: () => <StorefrontOrdersEmpty variant="unavailable" href="#" /> }

/** A lista a caminho: a busca e os cartões em cinza, cada um no seu lugar. */
export const Esqueleto: Story = {
  render: () => (
    <StorefrontAccountShell menu={menu} page={{ kind: "tab", title: "Meus pedidos", backHref: "#", tools: <StorefrontOrdersToolbarSkeleton /> }}>
      <StorefrontOrdersSkeleton />
    </StorefrontAccountShell>
  ),
}

/** No celular a busca desce para baixo do título e os fatos do cartão empilham. */
export const Celular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }
