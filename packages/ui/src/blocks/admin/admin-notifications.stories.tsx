// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { AdminNotifications } from "./admin-notifications"

const meta = {
  title: "Blocos/Admin/Notificações",
  component: AdminNotifications,
  decorators: [
    (Story) => (
      <div className="bg-header flex justify-end p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    unread: 3,
    ordersHref: "#",
    items: [
      { id: "o21", kind: "order", title: "Novo pedido nº 21", detail: "Bia Souza · R$ 129,90", when: "10:41", href: "#" },
      { id: "p20", kind: "payment", title: "Pedido nº 20 pago", detail: "Duda Reis · R$ 59,90", when: "10:30", href: "#" },
      { id: "m18", kind: "message", title: "Mensagem no pedido nº 18", detail: "Carla: o pedido chega até sexta?", when: "10:12", href: "#" },
      { id: "o19", kind: "order", title: "Novo pedido nº 19", detail: "Rafael Lima · R$ 39,90", when: "Ontem", href: "#" },
    ],
  },
} satisfies Meta<typeof AdminNotifications>

export default meta
type Story = StoryObj<typeof meta>

/** Click the bell: the latest of what came in — an order, a payment approved, a message — each leading to its order. */
export const ComNovidades: Story = {}

export const NadaNovo: Story = { args: { unread: 0, items: [] } }

export const Carregando: Story = { args: { unread: 0, items: [], pending: true } }
