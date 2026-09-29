import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAccountDetails } from "./storefront-account-details"
import { StorefrontAccountForm } from "./storefront-account-form"
import { StorefrontAccountMenu } from "./storefront-account-menu"
import { StorefrontAccountOrdersNote } from "./storefront-account-orders-note"
import { StorefrontAccountOverview } from "./storefront-account-overview"
import { StorefrontAccountShell } from "./storefront-account-shell"
import { StorefrontAccountSkeleton } from "./storefront-account-skeleton"
import { StorefrontOrderNow } from "./storefront-order-now"

const items = [
  { key: "overview" as const, href: "#" },
  { key: "orders" as const, href: "#", count: 1 },
  { key: "favorites" as const, href: "#", count: 12 },
  { key: "reviews" as const, href: "#", count: 2 },
  { key: "profile" as const, href: "#" },
  { key: "messages" as const, href: "#" },
]

const profile = {
  name: "Rafael Souza",
  email: "rafael@exemplo.com",
  phone: "5585999994321",
  address: { zipCode: "60160-230", street: "Rua Tibúrcio Cavalcante", number: "1200", complement: "apto 302", neighborhood: "Meireles", city: "Fortaleza", state: "CE" },
}

const meta = {
  title: "Blocos/Vitrine/Minha conta",
  component: StorefrontAccountShell,
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), padding: "0 32px" }}>{Story()}</div>],
  args: {
    menu: <StorefrontAccountMenu shopper={{ name: "Rafael Souza", contact: "(85) 99999-4321" }} items={items} current="overview" signOutAction="#" />,
    page: { kind: "overview" },
    children: (
      <StorefrontAccountOverview name="Rafael Souza">
        <StorefrontOrderNow
          eyebrow="Pedido nº 1042 · R$ 237,22 · Pix"
          headline="Em preparo"
          destination="Para Rafael Souza · Rua Tibúrcio Cavalcante, 1200, apto 302 — Fortaleza/CE"
          steps={[
            { label: "Pedido feito", when: "27 de set., 14:02", state: "done" },
            { label: "Loja confirmou", when: "27 de set., 15:10", state: "done" },
            { label: "Em preparo", when: "28 de set., 09:00", state: "current" },
            { label: "Saiu para entrega", when: null, state: "todo" },
            { label: "Entregue", when: null, state: "todo" },
          ]}
          href="#"
          more={{ label: "Você tem mais 1 pedido em andamento", href: "#" }}
        />
        <StorefrontAccountDetails phone="(85) 99999-4321" email="rafael@exemplo.com" address="Rua Tibúrcio Cavalcante, 1200, apto 302 — Meireles — Fortaleza/CE — CEP 60160-230" editHref="#" />
      </StorefrontAccountOverview>
    ),
  },
} satisfies Meta<typeof StorefrontAccountShell>

export default meta
type Story = StoryObj<typeof meta>

/** 6c: o menu com todas as abas do design, e a visão geral com o pedido em andamento e os dados. */
export const VisaoGeral: Story = {}

/** 6h: a aba Perfil e endereços, com o formulário do G3 e o menu ao lado. */
export const Perfil: Story = {
  args: {
    menu: <StorefrontAccountMenu shopper={{ name: "Rafael Souza", contact: "(85) 99999-4321" }} items={items} current="profile" signOutAction="#" />,
    page: { kind: "tab", title: "Perfil e endereços", backHref: "#" },
    children: <StorefrontAccountForm profile={profile} action="#" />,
  },
}

/** Nada a caminho: como terminou o último pedido, e os dados com o que falta dito. */
export const UltimoPedido: Story = {
  args: {
    children: (
      <StorefrontAccountOverview name="Bia Cliente">
        <StorefrontAccountOrdersNote kind="last" order={{ number: 12, headline: "Entregue em 26 de set. de 2026", detail: "Feito por você na loja em 24 de set., 10:15.", tone: "done" }} href="#" />
        <StorefrontAccountDetails phone={null} email="bia@exemplo.com" address={null} editHref="#" />
      </StorefrontAccountOverview>
    ),
  },
}

/** Nunca pediu aqui: o convite às compras no lugar do pedido. */
export const SemPedidos: Story = {
  args: {
    children: (
      <StorefrontAccountOverview name="Bia Cliente">
        <StorefrontAccountOrdersNote kind="none" href="#" />
        <StorefrontAccountDetails phone="(85) 98888-1234" email="bia@exemplo.com" address={null} editHref="#" />
      </StorefrontAccountOverview>
    ),
  },
}

/** Uma aba a caminho. */
export const Esqueleto: Story = {
  args: { page: { kind: "tab", title: "Perfil e endereços", backHref: "#" }, children: <StorefrontAccountSkeleton /> },
}

/** No celular, a visão geral vem primeiro e o menu embaixo; uma aba abre em tela própria, com voltar. */
export const Celular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }

export const CelularAba: Story = {
  ...Perfil,
  globals: { viewport: { value: "mobile1", isRotated: false } },
}
