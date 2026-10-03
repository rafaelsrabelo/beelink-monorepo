"use client"

// React
import { useState } from "react"

// UI
import { OrderLabelCard } from "@harness-monorepo/ui/blocks/orders/order-label-card"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { OrderLabelFormValues, OrderLabelIssues } from "@harness-monorepo/ui/lib/label"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { integrationPagesOf } from "@/lib/integration-pages"
import { AppLink } from "@/components/app-link"
import { labelCardViewOf, labelErrorOf, labelFormOf, labelPayloadOf } from "@/lib/order-label-form"
import { useBuyOrderLabel, useCancelOrderLabel, useOrderLabel, usePrintOrderLabel } from "@/services/orders/label-hooks"
import { OrderRequestError } from "@/services/orders/order-requests"

export interface OrderLabelSectionProps {
  slug: string
  number: number
  locale: string
  messages: UiMessages
}

const NO_ISSUES: OrderLabelIssues = {}

/**
 * The order's shipping label (BEELINK-187), bought from the shop's Melhor Envio wallet: the box is
 * what is typed until it is bought, and the PDF opens in a tab the press itself opens — a browser
 * blocks one opened after a request's wait.
 */
export function OrderLabelSection({ slug, number, locale, messages }: OrderLabelSectionProps) {
  const text = messages.orders.label
  const overview = useOrderLabel(slug, number, true)
  const buy = useBuyOrderLabel(slug, number)
  const cancel = useCancelOrderLabel(slug, number)
  const print = usePrintOrderLabel(slug, number)
  const [typed, setTyped] = useState<OrderLabelFormValues | null>(null)
  const [issues, setIssues] = useState<OrderLabelIssues>(NO_ISSUES)
  const money = (cents: number) => formatCents(cents, locale, "BRL")

  if (overview.isPending) return <Skeleton className="h-56 w-full rounded-xl" />
  if (!overview.data) return <p className="text-muted-foreground text-sm">{text.errors.UNKNOWN}</p>
  // A carrier the shopkeeper told by hand was not chosen at checkout: no service to buy a label with, and nothing to say.
  if (overview.data.blockers.includes("NOT_CARRIER") && !overview.data.label) return null

  const value = typed ?? labelFormOf(overview.data)
  const failed = buy.error ?? cancel.error ?? print.error
  const error = failed ? labelErrorOf(failed instanceof OrderRequestError ? failed.errorCode : "UNKNOWN", failed instanceof OrderRequestError ? failed.details : undefined, text, money) : null

  function reset() {
    buy.reset()
    cancel.reset()
    print.reset()
  }

  return (
    <OrderLabelCard
      view={labelCardViewOf(overview.data, text, {
        money,
        date: (iso) => new Date(iso).toLocaleDateString(locale),
        integrationsHref: integrationPagesOf(slug).melhorEnvio,
        storeHref: `/admin/${encodeURIComponent(slug)}/store`,
      })}
      value={value}
      onChange={(next) => {
        reset()
        setIssues(NO_ISSUES)
        setTyped(next)
      }}
      onBuy={() => {
        reset()
        const read = labelPayloadOf(value, text.issues)
        if ("issues" in read) return setIssues(read.issues)
        buy.mutate(read.payload, { onSuccess: () => setTyped(null) })
      }}
      onPrint={() => {
        reset()
        const tab = window.open("", "_blank")
        if (tab) tab.opener = null
        print.mutate(undefined, {
          onSuccess: ({ url }) => {
            if (tab) tab.location.href = url
            else window.location.assign(url)
          },
          onError: () => tab?.close(),
        })
      }}
      onCancel={() => {
        reset()
        cancel.mutate(undefined, { onSuccess: () => setTyped(null) })
      }}
      issues={issues}
      pending={buy.isPending ? "buy" : print.isPending ? "print" : cancel.isPending ? "cancel" : null}
      error={error}
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
