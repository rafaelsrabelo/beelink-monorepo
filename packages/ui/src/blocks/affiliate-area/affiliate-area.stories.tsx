import type { Meta, StoryObj } from "@storybook/react-vite"

import { AffiliateAreaNotice } from "./affiliate-area-notice"
import { AffiliateAreaShell } from "./affiliate-area-shell"
import { AffiliateAreaSkeleton } from "./affiliate-area-skeleton"
import { AffiliateAreaTabs } from "./affiliate-area-tabs"
import { home, orders, pausedHome, payouts, products, profile, shops } from "./affiliate-area.fixtures"
import { AffiliateHomePanel } from "./affiliate-home-panel"
import { AffiliateOrdersList } from "./affiliate-orders-list"
import { AffiliatePayoutsList } from "./affiliate-payouts-list"
import { AffiliateProductLinks } from "./affiliate-product-links"
import { AffiliateProfileForm } from "./affiliate-profile-form"
import { AffiliateShopCards } from "./affiliate-shop-cards"

const noop = () => {}
const user = { name: "Maria Souza", email: "maria@exemplo.com" }
const tabs = ["home", "products", "orders", "statement", "profile"] as const

/** One shop's page, as the web composes it inside the area's frame. */
function ShopPage() {
  return (
    <AffiliateAreaShell user={user} panelHref={null} onSignOut={noop}>
      <h1 className="text-2xl font-semibold">Loja da Ana</h1>
      <AffiliateAreaTabs active="home" tabs={tabs} hrefOf={(tab) => `#${tab}`} />
      <AffiliateHomePanel home={home} copied={false} onCopy={noop} />
    </AffiliateAreaShell>
  )
}

const meta = {
  title: "Blocos/Afiliado/Área do afiliado",
  component: ShopPage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ShopPage>

export default meta
type Story = StoryObj<typeof meta>

/** O início numa loja: saldos, próximo pagamento, o link e os números. */
export const Inicio: Story = {}

/** Pausado: o aviso em cima. */
export const Pausado: Story = { render: () => <AffiliateHomePanel home={pausedHome} copied onCopy={noop} /> }

/** As lojas da conta. */
export const Lojas: Story = {
  render: () => (
    <AffiliateAreaShell user={user} panelHref="/admin" onSignOut={noop}>
      <AffiliateShopCards shops={shops} />
    </AffiliateAreaShell>
  ),
}

/** Nenhuma loja ainda. */
export const SemLojas: Story = { render: () => <AffiliateShopCards shops={[]} /> }

export const Produtos: Story = {
  render: () => <AffiliateProductLinks products={products} pager={{ page: 1, pageSize: 20, total: 2 }} search="" onSearch={noop} onPage={noop} copiedId="p1" onCopy={noop} />,
}

export const Vendas: Story = { render: () => <AffiliateOrdersList orders={orders} pager={{ page: 1, pageSize: 20, total: 2 }} onPage={noop} /> }

export const Pagamentos: Story = { render: () => <AffiliatePayoutsList payouts={payouts} pager={{ page: 1, pageSize: 20, total: 1 }} onPage={noop} /> }

export const MeusDados: Story = { render: () => <AffiliateProfileForm value={profile} onChange={noop} onSubmit={noop} name="Maria Souza" /> }

export const Encerrado: Story = { render: () => <AffiliateProfileForm value={profile} onChange={noop} onSubmit={noop} name="Maria Souza" showcaseLocked /> }

export const Carregando: Story = { render: () => <AffiliateAreaSkeleton /> }

export const NaoVende: Story = { render: () => <AffiliateAreaNotice kind="notFound" /> }
