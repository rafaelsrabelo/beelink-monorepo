"use client"

// React
import { useEffect, useRef } from "react"

// Next
import { useRouter } from "next/navigation"

// UI
import { OrderDeliveryCard } from "@harness-monorepo/ui/blocks/orders/order-delivery-card"
import { OrderFeeCard } from "@harness-monorepo/ui/blocks/orders/order-fee-card"
import { OrderDetail } from "@harness-monorepo/ui/blocks/orders/order-detail"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { isRefundable } from "@harness-monorepo/ui/lib/order-payment"
import { defaultLocale } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { AppLink } from "@/components/app-link"
import { OrderConversationSection } from "@/components/conversations/order-conversation-section"
import { OrderLabelSection } from "@/components/orders/order-label-section"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { addressLineOf } from "@/lib/customer-address"
import { shopOrderMessageOf, whatsappOrderHref } from "@/lib/whatsapp-order"
import { useMarkOrderPaymentSeen, useOrder, useOrderDelivery, useOrderDeliveryFee, useUpdateOrderStatus } from "@/services/orders/order-hooks"
import { useStore } from "@/services/stores/store-hooks"

export interface OrderScreenProps {
  slug: string
  number: number
  messages: UiMessages
  web: WebMessages
}

/** One of the shop's orders: what was sold, to whom, and the status the shopkeeper moves along. */
export function OrderScreen({ slug, number, messages, web }: OrderScreenProps) {
  const order = useOrder(slug, number)
  const store = useStore(slug)
  const status = useUpdateOrderStatus(slug, number)
  const delivery = useOrderDelivery(slug, number)
  const fee = useOrderDeliveryFee(slug, number)
  const { mutate: markSeen } = useMarkOrderPaymentSeen(slug, number)
  const router = useRouter()
  const listHref = `/admin/${slug}/orders`
  const refundHref = `/admin/${slug}/orders/${number}/refund`

  // Opening a paid order is what tells the bell it was seen (BEELINK-207). Once per order on screen:
  // a say that fails is not asked again in a loop, and the next opening asks once more.
  const asked = useRef<number | null>(null)
  const unseen = order.data?.payment?.unseen === true
  useEffect(() => {
    if (!unseen || asked.current === number) return
    asked.current = number
    markSeen()
  }, [unseen, number, markSeen])

  if (order.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:px-6">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-6 @4xl/main:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    )
  }

  if (!order.data) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 lg:px-6">
        <p role="alert" className="text-destructive text-sm">
          {pageErrorCopy(order.error, web)}
        </p>
        <AppLink href={listHref} className="text-sm underline underline-offset-4">
          {messages.orders.detail.back}
        </AppLink>
      </div>
    )
  }

  const current = order.data
  const whatsappHref = current.customer.phone
    ? whatsappOrderHref(current.customer.phone, shopOrderMessageOf({ shopName: store.data?.name ?? "", order: current, locale: defaultLocale, messages }))
    : null

  return (
    <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
      <OrderDetail
        order={current}
        backHref={listHref}
        deliveryLine={current.deliveryAddress ? addressLineOf(current.deliveryAddress) : null}
        whatsappHref={whatsappHref}
        customerHref={`/admin/${slug}/customers/${current.customer.id}`}
        onStatusChange={(next) => status.mutate(next)}
        // An order that holds money is cancelled with its refund, which has a screen of its own (BEELINK-208).
        onCancel={isRefundable(current.payment) ? () => router.push(`${refundHref}?cancel=1` as Parameters<typeof router.push>[0]) : undefined}
        refundHref={refundHref}
        strayRefundHref={(strayId) => `${refundHref}?stray=${encodeURIComponent(strayId)}`}
        statusPending={status.isPending}
        statusError={pageErrorCopy(status.error, web)}
        delivery={
          current.fulfillment === "DELIVERY" ? (
            <div className="flex flex-col gap-4">
              {/* A cancelled order's fee no longer changes: the API refuses it, so the card is not offered. */}
              {current.status !== "CANCELLED" ? (
                <OrderFeeCard
                  feeCents={current.deliveryFeeCents}
                  onSave={(cents) => fee.mutate(cents)}
                  pending={fee.isPending}
                  error={fee.error ? pageErrorCopy(fee.error, web) : null}
                  saved={fee.isSuccess}
                  messages={messages}
                />
              ) : null}
              {/* A carrier chosen at checkout carries the service its label is bought with (BEELINK-187). */}
              {current.delivery?.kind === "CARRIER" ? <OrderLabelSection slug={slug} number={current.number} locale={defaultLocale} messages={messages} /> : null}
            <OrderDeliveryCard
              delivery={current.delivery}
              onSave={(next) => delivery.mutate(next)}
              onClear={() => delivery.mutate(null)}
              pending={delivery.isPending}
              error={delivery.error ? pageErrorCopy(delivery.error, web) : null}
              // A save, not a removal: "Entrega salva." over an emptied form would say the opposite.
              saved={delivery.isSuccess && delivery.variables !== null}
              needed={current.status === "OUT_FOR_DELIVERY" && !current.delivery}
              messages={messages}
            />
            </div>
          ) : undefined
        }
        conversation={<OrderConversationSection slug={slug} number={current.number} locale={defaultLocale} messages={messages} />}
        linkComponent={AppLink}
        messages={messages}
      />
    </div>
  )
}
