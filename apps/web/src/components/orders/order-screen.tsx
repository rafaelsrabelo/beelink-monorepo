"use client"

// UI
import { OrderDetail } from "@harness-monorepo/ui/blocks/orders/order-detail"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { defaultLocale } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { AppLink } from "@/components/app-link"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { addressLineOf } from "@/lib/customer-address"
import { shopOrderMessageOf, whatsappOrderHref } from "@/lib/whatsapp-order"
import { useOrder, useUpdateOrderStatus } from "@/services/orders/order-hooks"
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
  const listHref = `/admin/${slug}/orders`

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
        addressLine={addressLineOf(current.customer.address)}
        whatsappHref={whatsappHref}
        customerHref={`/admin/${slug}/customers/${current.customer.id}`}
        onStatusChange={(next) => status.mutate(next)}
        statusPending={status.isPending}
        statusError={pageErrorCopy(status.error, web)}
        linkComponent={AppLink}
        messages={messages}
      />
    </div>
  )
}
