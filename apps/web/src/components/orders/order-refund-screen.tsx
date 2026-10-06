"use client"

// Next
import { useRouter } from "next/navigation"

// UI
import { OrderRefundForm, type OrderRefundKind } from "@harness-monorepo/ui/blocks/orders/order-refund-form"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { isRefundable } from "@harness-monorepo/ui/lib/order-payment"
import { defaultLocale } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { AppLink } from "@/components/app-link"
import { pageErrorCopy } from "@/components/design/page-error-copy"
import { orderRefundRefusalOf } from "@/lib/order-refund-refusal"
import { useOrder, useRefundOrder } from "@/services/orders/order-hooks"

export interface OrderRefundScreenProps {
  slug: string
  number: number
  /** The order is cancelled with the refund: all that is left goes back first. */
  cancel?: boolean
  /** Money the order did not ask for, by its id, instead of the order's own payment. */
  strayId?: string | null
  messages: UiMessages
  web: WebMessages
}

/**
 * The refund of an order's payment, on its own screen (BEELINK-208): what was paid and what is
 * left, how much goes back and why. What is left is read from the order as the API tells it now,
 * and sent back with the refund — a refund made meanwhile, in another tab, is refused rather than
 * made twice, and the form starts over from the new amounts. Once Asaas took it, back to the order.
 */
export function OrderRefundScreen({ slug, number, cancel = false, strayId = null, messages, web }: OrderRefundScreenProps) {
  const router = useRouter()
  const order = useOrder(slug, number)
  const refund = useRefundOrder(slug, number)
  const orderHref = `/admin/${slug}/orders/${number}`

  if (order.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 lg:px-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const payment = order.data?.payment ?? null
  if (!order.data || !payment) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 lg:px-6">
        <p role="alert" className="text-destructive text-sm">
          {order.data ? messages.orders.detail.refund.nothing : pageErrorCopy(order.error, web)}
        </p>
        <AppLink href={orderHref} className="text-sm underline underline-offset-4">
          {messages.orders.detail.refund.back}
        </AppLink>
      </div>
    )
  }

  const stray = strayId ? (payment.strays.find((each) => each.id === strayId) ?? null) : null
  const kind: OrderRefundKind = strayId ? "stray" : cancel ? "cancel" : "payment"
  const refundableCents = strayId ? (stray?.refundableCents ?? 0) : isRefundable(payment) ? payment.refundableCents : 0
  const paidCents = stray ? stray.amountCents : payment.amountCents

  return (
    <div className="mx-auto w-full max-w-xl px-4 lg:px-6">
      <OrderRefundForm
        // Started over when what is left changes under it: its amount is no longer the one to offer.
        key={refundableCents}
        number={number}
        kind={kind}
        method={stray ? stray.method : payment.method}
        paidCents={paidCents}
        refundedCents={strayId ? 0 : payment.refundedCents}
        refundingCents={strayId ? paidCents - refundableCents : payment.refundingCents}
        refundableCents={refundableCents}
        backHref={orderHref}
        onSubmit={({ amountCents, reason }) =>
          refund.mutate({ amountCents, reason, refundableCents, cancel: kind === "cancel", ...(strayId ? { strayId } : {}) }, { onSuccess: () => router.push(orderHref as Parameters<typeof router.push>[0]) })
        }
        pending={refund.isPending || refund.isSuccess}
        error={orderRefundRefusalOf(refund.error, web, defaultLocale)}
        linkComponent={AppLink}
        messages={messages}
      />
    </div>
  )
}
