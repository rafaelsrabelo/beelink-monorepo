"use client"

// Next
import { useRouter } from "next/navigation"

// Types
import type { Order } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { GestorCourier } from "@harness-monorepo/ui/blocks/gestor/gestor-courier"
import { OrderFacts } from "@harness-monorepo/ui/blocks/orders/order-facts"
import { OrderItems } from "@harness-monorepo/ui/blocks/orders/order-items"
import { OrderPaymentCard } from "@harness-monorepo/ui/blocks/orders/order-payment-card"
import { OrderStatusActions } from "@harness-monorepo/ui/blocks/orders/order-status-actions"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { isRefundable } from "@harness-monorepo/ui/lib/order-payment"

// App
import type { WebMessages } from "@/locales"
import { AppLink } from "@/components/app-link"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { courierMessageOf, whatsappShareHref } from "@/lib/courier-message"
import { addressLineOf } from "@/lib/customer-address"
import { shopOrderMessageOf, whatsappOrderHref } from "@/lib/whatsapp-order"
import { useUpdateOrderStatus } from "@/services/orders/order-hooks"

export interface GestorOrderBodyProps {
  slug: string
  order: Order
  shopName: string
  locale: string
  messages: UiMessages
  web: WebMessages
}

/**
 * The opened order's "Pedido" tab: moving it along, what was sold, how it is paid, who it is for —
 * the panel's own blocks — and, while a delivery is still to go, calling its courier.
 */
export function GestorOrderBody({ slug, order, shopName, locale, messages, web }: GestorOrderBodyProps) {
  const router = useRouter()
  const status = useUpdateOrderStatus(slug, order.number)
  const refundHref = `/admin/${slug}/orders/${order.number}/refund`
  const money = (cents: number) => formatCents(cents, locale, "BRL")
  const when = (iso: string) => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso))
  const courier = courierMessageOf({ shopName, order, locale, messages })
  const toGo = order.fulfillment === "DELIVERY" && order.status !== "CANCELLED" && order.status !== "DELIVERED"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <OrderStatusActions
          number={order.number}
          status={order.status}
          fulfillment={order.fulfillment}
          onChange={(next) => status.mutate(next)}
          // An order that holds money is cancelled with its refund, which has a screen of its own (BEELINK-208).
          onCancel={isRefundable(order.payment) ? () => router.push(`${refundHref}?cancel=1` as Parameters<typeof router.push>[0]) : undefined}
          pending={status.isPending}
          messages={messages}
        />
        {status.error ? (
          <p role="alert" className="text-destructive text-sm">
            {pageErrorCopy(status.error, web)}
          </p>
        ) : null}
      </div>
      <OrderItems order={order} money={money} messages={messages} />
      {order.paymentChannel === "ONLINE" ? (
        <OrderPaymentCard
          payment={order.payment ?? null}
          money={money}
          when={when}
          refundHref={refundHref}
          strayRefundHref={(strayId) => `${refundHref}?stray=${encodeURIComponent(strayId)}`}
          linkComponent={AppLink}
          messages={messages}
        />
      ) : null}
      <OrderFacts
        order={order}
        deliveryLine={order.deliveryAddress ? addressLineOf(order.deliveryAddress) : null}
        whatsappHref={order.customer.phone ? whatsappOrderHref(order.customer.phone, shopOrderMessageOf({ shopName, order, locale, messages })) : null}
        customerHref={`/admin/${slug}/customers/${order.customer.id}`}
        linkComponent={AppLink}
        messages={messages}
      />
      {toGo ? <GestorCourier whatsappHref={courier ? whatsappShareHref(courier) : null} messages={messages} /> : null}
    </div>
  )
}
