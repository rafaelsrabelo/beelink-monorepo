import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { ShopPaletteProvider } from "./shop-palette-context"
import { StorefrontConversationComposer } from "./storefront-conversation-composer"
import { StorefrontConversationList, type StorefrontConversationRow } from "./storefront-conversation-list"
import { StorefrontConversationListSkeleton } from "./storefront-conversation-list-skeleton"
import { StorefrontConversationThread, type StorefrontConversationLine } from "./storefront-conversation-thread"
import { StorefrontConversationThreadSkeleton } from "./storefront-conversation-thread-skeleton"
import { StorefrontConversationsLink } from "./storefront-conversations-link"
import { StorefrontConversationsPanel } from "./storefront-conversations-panel"
import { StorefrontOrderTalk } from "./storefront-order-talk"

const colors = sampleColorPresets[2]!.colors

const rows: StorefrontConversationRow[] = [
  { number: 1042, title: "Pedido nº 1042", preview: "Sai amanhã cedo, chega na quinta.", when: "Hoje, 10:40", unread: 2, closed: false, href: "#" },
  { number: 1038, title: "Pedido nº 1038", preview: "Você: Pode deixar na portaria?", when: "Ontem, 18:02", unread: 0, closed: false, href: "#" },
  { number: 1011, title: "Pedido nº 1011", preview: "Você: Obrigado!", when: "12 de set., 09:12", unread: 0, closed: true, href: "#" },
]

const lines: StorefrontConversationLine[] = [
  { id: "1", mine: true, body: "Oi! O pedido chega até sexta?", when: "Hoje, 10:02" },
  { id: "2", mine: false, body: "Oi, Rafael! Chega, sim.\nSai amanhã cedo pelos Correios.", when: "Hoje, 10:40" },
  { id: "3", mine: true, body: "Perfeito, obrigado!", when: "Hoje, 10:41", seen: "Lida" },
]

const composer = <StorefrontConversationComposer value="" onChange={() => undefined} onSubmit={() => undefined} canSend={false} />

const meta = {
  title: "Blocos/Vitrine/Conversas",
  component: StorefrontConversationList,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <ShopPaletteProvider colors={colors}>
        <div style={{ ...shopPaletteStyle(colors), maxWidth: 448 }} className="bg-shop-background p-4">
          {Story()}
        </div>
      </ShopPaletteProvider>
    ),
  ],
  args: { rows },
} satisfies Meta<typeof StorefrontConversationList>

export default meta
type Story = StoryObj<typeof meta>

/** The list: those still taking messages first, unread in bold with their count, the ended ones marked. */
export const Lista: Story = {}

export const Nenhuma: Story = { args: { rows: [] } }

export const Conversa: Story = {
  render: () => (
    <div className="flex h-[520px] flex-col">
      <StorefrontConversationThread title="Pedido nº 1042" orderHref="#" back={{ href: "#" }} lines={lines} closed={false} composer={composer} />
    </div>
  ),
}

/** Delivered or cancelled: the history stays, the composer gives way to the words that it ended. */
export const Encerrada: Story = {
  render: () => (
    <div className="flex h-[420px] flex-col">
      <StorefrontConversationThread title="Pedido nº 1011" orderHref="#" back={{ href: "#" }} lines={lines} closed />
    </div>
  ),
}

export const PrimeiraMensagem: Story = {
  render: () => (
    <div className="flex h-[320px] flex-col">
      <StorefrontConversationThread title="Pedido nº 1050" orderHref="#" lines={[]} closed={false} composer={composer} />
    </div>
  ),
}

export const Carregando: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <StorefrontConversationListSkeleton />
      <StorefrontConversationThreadSkeleton />
    </div>
  ),
}

/** The ways in: the header's balloon with its count, and "Falar com a loja" on an order. */
export const Entradas: Story = {
  render: () => (
    <div className="flex items-center gap-6 text-shop-on-background">
      <StorefrontConversationsLink href="#" unread={3} />
      <StorefrontOrderTalk href="#" />
      <StorefrontOrderTalk href="#" size="md" />
    </div>
  ),
}

/** The panel, open: from the right on a computer, the whole screen on a phone. */
export const Painel: Story = {
  render: () => (
    <StorefrontConversationsPanel open onOpenChange={() => undefined}>
      <StorefrontConversationList rows={rows} />
    </StorefrontConversationsPanel>
  ),
}
