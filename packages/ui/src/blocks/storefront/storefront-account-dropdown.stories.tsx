// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontAccountDropdown } from "./storefront-account-dropdown"

const meta = {
  title: "Blocos/Vitrine/Menu da conta",
  component: StorefrontAccountDropdown,
  parameters: { layout: "padded" },
  args: {
    name: "Marina Souza",
    href: "/padaria-da-ana/conta",
    items: [
      { key: "orders", href: "/padaria-da-ana/conta/pedidos" },
      { key: "profile", href: "/padaria-da-ana/conta/perfil" },
      { key: "messages", href: "/padaria-da-ana/conta/conversas" },
    ],
    signOutAction: "/padaria-da-ana/api/customer/sair",
  },
  render: (args) => (
    <div className="flex justify-end" style={{ background: "var(--shop-header)", color: "var(--shop-on-header)", padding: 16, minHeight: 320 }}>
      <StorefrontAccountDropdown {...args} />
    </div>
  ),
} satisfies Meta<typeof StorefrontAccountDropdown>

export default meta
type Story = StoryObj<typeof meta>

/** O cliente entrado: passe o mouse ou clique em “Minha conta” para abrir. */
export const Completo: Story = {}

/** Antes de a conversa existir na loja: só as páginas que existem aparecem. */
export const SoPedidosEPerfil: Story = {
  args: {
    items: [
      { key: "orders", href: "/padaria-da-ana/conta/pedidos" },
      { key: "profile", href: "/padaria-da-ana/conta/perfil" },
    ],
  },
}
