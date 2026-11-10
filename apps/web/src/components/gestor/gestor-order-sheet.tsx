"use client"

// UI
import { OrderStatusBadge } from "@harness-monorepo/ui/blocks/orders/order-status-badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@harness-monorepo/ui/components/sheet"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@harness-monorepo/ui/components/tabs"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { ShopConversationLive } from "@/components/conversations/shop-conversation-live"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { usePaymentSeen } from "@/components/orders/use-payment-seen"
import type { GestorOrderTab } from "@/lib/gestor-board"
import { useOrder } from "@/services/orders/order-hooks"
import { useStore } from "@/services/stores/store-hooks"
import { GestorOrderBody } from "./gestor-order-body"

export interface GestorOrderSheetProps {
  slug: string
  number: number
  tab: GestorOrderTab
  onTab: (tab: GestorOrderTab) => void
  onClose: () => void
  locale: string
  messages: UiMessages
  web: WebMessages
}

/**
 * An order opened beside the board (plan 2026-11-10--modo-gestor): "Pedido" — the order and calling
 * its courier — and "Conversa", the order's chat with its customer. The tab is in the address, so
 * a conversation is a link the list of conversations can open straight.
 */
export function GestorOrderSheet({ slug, number, tab, onTab, onClose, locale, messages, web }: GestorOrderSheetProps) {
  const text = messages.gestor.order
  const order = useOrder(slug, number)
  const store = useStore(slug)
  usePaymentSeen(slug, number, order.data?.payment?.unseen === true)

  return (
    <Sheet
      open
      onOpenChange={(open: boolean) => {
        if (!open) onClose()
      }}
    >
      <SheetContent side="right" closeLabel={text.close} className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 pt-5 pb-3">
          <SheetTitle className="text-lg tabular-nums">{format(text.title, { number: String(number) })}</SheetTitle>
          {order.data ? (
            <SheetDescription className="flex flex-wrap items-center gap-2">
              <span className="text-foreground font-medium">{order.data.customer.name}</span>
              <OrderStatusBadge status={order.data.status} fulfillment={order.data.fulfillment} messages={messages} />
            </SheetDescription>
          ) : null}
        </SheetHeader>

        <Tabs value={tab} onValueChange={(next) => onTab(next === "conversa" ? "conversa" : "pedido")} className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList variant="line" className="w-full justify-start px-5">
            <TabsTrigger value="pedido">{text.tabs.order}</TabsTrigger>
            <TabsTrigger value="conversa">{text.tabs.conversation}</TabsTrigger>
          </TabsList>
          <TabsContent value="pedido" className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {order.isPending ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : order.data ? (
              <GestorOrderBody slug={slug} order={order.data} shopName={store.data?.name ?? ""} locale={locale} messages={messages} web={web} />
            ) : (
              <p role="alert" className="text-destructive text-sm">
                {pageErrorCopy(order.error, web) ?? text.failed}
              </p>
            )}
          </TabsContent>
          <TabsContent value="conversa" className="flex min-h-0 flex-1 flex-col px-5 py-4">
            <ShopConversationLive slug={slug} number={number} locale={locale} headed={false} messages={messages} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
