import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontAccountForm } from "./storefront-account-form"
import { StorefrontAccountMenu } from "./storefront-account-menu"
import { StorefrontAccountOverview } from "./storefront-account-overview"
import { StorefrontAccountShell } from "./storefront-account-shell"
import { StorefrontAccountSkeleton } from "./storefront-account-skeleton"

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
      <StorefrontAccountOverview
        name="Rafael Souza"
        shortcuts={[
          { key: "orders", href: "#", hint: "Acompanhe, compre de novo ou peça ajuda" },
          { key: "favorites", href: "#", hint: "12 produtos · 2 baixaram de preço" },
          { key: "profile", href: "#", hint: "Seus dados e o endereço de entrega" },
        ]}
      />
    ),
  },
} satisfies Meta<typeof StorefrontAccountShell>

export default meta
type Story = StoryObj<typeof meta>

/** 6c: o menu com todas as abas do design, e a visão geral. */
export const VisaoGeral: Story = {}

/** 6h: a aba Perfil e endereços, com o formulário do G3 e o menu ao lado. */
export const Perfil: Story = {
  args: {
    menu: <StorefrontAccountMenu shopper={{ name: "Rafael Souza", contact: "(85) 99999-4321" }} items={items} current="profile" signOutAction="#" />,
    page: { kind: "tab", title: "Perfil e endereços", backHref: "#" },
    children: <StorefrontAccountForm profile={profile} action="#" />,
  },
}

/** Só o que já existe: a visão geral de uma loja onde só o perfil foi entregue. */
export const SoPerfil: Story = {
  args: {
    menu: <StorefrontAccountMenu shopper={{ name: "Bia Cliente", contact: "bia@exemplo.com" }} items={items.filter((item) => item.key === "overview" || item.key === "profile")} current="overview" signOutAction="#" />,
    children: <StorefrontAccountOverview name="Bia Cliente" shortcuts={[{ key: "profile", href: "#", hint: "Seus dados e o endereço de entrega" }]} />,
  },
}

/** Uma aba a caminho. */
export const Esqueleto: Story = {
  args: { page: { kind: "tab", title: "Perfil e endereços", backHref: "#" }, children: <StorefrontAccountSkeleton /> },
}

/** No celular, a raiz é o menu em lista; uma aba abre em tela própria, com voltar. */
export const Celular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }

export const CelularAba: Story = {
  ...Perfil,
  globals: { viewport: { value: "mobile1", isRotated: false } },
}
