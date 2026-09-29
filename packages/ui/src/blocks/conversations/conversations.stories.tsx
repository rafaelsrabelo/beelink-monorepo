// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ConversationFailed } from "./conversation-failed"
import { ConversationFilters } from "./conversation-filters"
import { ConversationList } from "./conversation-list"
import { ConversationListSkeleton } from "./conversation-list-skeleton"
import { ConversationReply } from "./conversation-reply"
import { ConversationThread } from "./conversation-thread"
import { ConversationThreadSkeleton } from "./conversation-thread-skeleton"

const rows = [
  { number: 18, customer: "Carla Souza", order: "Pedido nº 18 · Saiu para entrega", preview: "O pedido chega até sexta?", when: "Hoje, 10:40", unread: 2, closed: false, href: "#" },
  { number: 17, customer: "Bia Lima", order: "Pedido nº 17 · Em preparo", preview: "Você: Sai amanhã cedo.", when: "Ontem, 18:02", unread: 0, closed: false, href: "#" },
  { number: 11, customer: "Rafael Rocha", order: "Pedido nº 11 · Entregue", preview: "Obrigado!", when: "12 de set., 09:12", unread: 0, closed: true, href: "#" },
]

const meta = {
  title: "Blocos/Painel/Conversas",
  component: ConversationList,
  args: { rows, current: 18 },
} satisfies Meta<typeof ConversationList>

export default meta
type Story = StoryObj<typeof meta>

export const Lista: Story = {}
export const Carregando: Story = { render: () => <ConversationListSkeleton /> }

export const Conversa: Story = {
  render: () => (
    <div className="flex h-[480px] max-w-2xl flex-col">
      <ConversationThread
        customer="Carla Souza"
        order="Pedido nº 18 · Saiu para entrega"
        orderHref="#"
        customerHref="#"
        lines={[
          { id: "1", mine: false, body: "Oi! O pedido chega até sexta?", when: "Hoje, 10:02" },
          { id: "2", mine: true, body: "Chega, sim. Sai amanhã cedo.", when: "Hoje, 10:40", seen: "Lida" },
        ]}
        state="open"
        reply={<ConversationReply value="" onChange={() => undefined} onSubmit={() => undefined} canSend={false} />}
      />
    </div>
  ),
}

export const Filtros: Story = {
  render: () => (
    <ConversationFilters
      filters={[
        { key: "OPEN", label: "Abertas", href: "#", active: true },
        { key: "UNREAD", label: "Não lidas", href: "#", active: false },
        { key: "ALL", label: "Todas", href: "#", active: false },
      ]}
      search=""
      onSearch={() => undefined}
    />
  ),
}

/** Delivered or cancelled: the history stays, the answer gives way to the words that it ended. */
export const Encerrada: Story = {
  render: () => (
    <ConversationThread customer="Rafael Rocha" order="Pedido nº 11 · Entregue" lines={[{ id: "1", mine: false, body: "Obrigado!", when: "12 de set., 09:12" }]} state="closed" />
  ),
}

export const SemMensagens: Story = { render: () => <ConversationThread customer="Bia Lima" order="Pedido nº 17" lines={[]} state="empty" /> }

export const ConversaCarregando: Story = { render: () => <ConversationThreadSkeleton /> }

export const Falhou: Story = { render: () => <ConversationFailed message="As conversas não carregaram." onRetry={() => undefined} /> }
