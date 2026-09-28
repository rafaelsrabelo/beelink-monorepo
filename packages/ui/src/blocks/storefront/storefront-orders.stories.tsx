import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontOrderCard, type StorefrontOrderCardProps } from "./storefront-order-card"
import { StorefrontOrderTabs } from "./storefront-order-tabs"
import { StorefrontOrdersEmpty } from "./storefront-orders-empty"
import { StorefrontOrdersSkeleton } from "./storefront-orders-skeleton"
import { StorefrontOrdersToolbar } from "./storefront-orders-toolbar"

const items = [
  { name: "Pré-Treino Haze Hardcore 300g", href: "#", imageUrl: null, meta: "Sabor: Frutas vermelhas · Qtd. 1" },
  { name: "Creatina Monohidratada 300g", href: "#", imageUrl: null, meta: "Sem sabor · Qtd. 1" },
]

const received: StorefrontOrderCardProps = {
  number: 1042,
  placedOn: "21 set 2026",
  total: "R$ 237,22 · Pix",
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

/** The list as the tab draws it: the toolbar, the tabs and a card per order. */
function OrdersList({ cards }: { cards: readonly StorefrontOrderCardProps[] }) {
  return (
    <div className="flex flex-col gap-5">
      <StorefrontOrdersToolbar action="#" names={{ search: "q", period: "periodo" }} value={{ search: "", period: "" }} periods={periods} />
      <StorefrontOrderTabs tabs={tabs} />
      <ul className="flex flex-col gap-4">
        {cards.map((card) => (
          <li key={card.number}>
            <StorefrontOrderCard {...card} />
          </li>
        ))}
      </ul>
    </div>
  )
}

const meta = {
  title: "Blocos/Vitrine/Meus pedidos",
  component: OrdersList,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), maxWidth: 880 }}>{Story()}</div>],
  args: { cards: [received, delivered, cancelled] },
} satisfies Meta<typeof OrdersList>

export default meta
type Story = StoryObj<typeof meta>

/** 6d: aguardando a loja, entregue e cancelado. */
export const Lista: Story = {}

/** Nunca pediu aqui: uma frase e a porta para as compras. */
export const SemPedidos: Story = { render: () => <StorefrontOrdersEmpty variant="none" href="#" /> }

/** Os filtros não acharam nada: a frase e o caminho para limpar. */
export const SemResultados: Story = { render: () => <StorefrontOrdersEmpty variant="filtered" href="#" /> }

/** A lista a caminho. */
export const Esqueleto: Story = { render: () => <StorefrontOrdersSkeleton /> }

/** No celular os fatos do cartão empilham. */
export const Celular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }
