"use client"

// React
import { useState } from "react"

// UI
import { AffiliateAreaNotice } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-area-notice"
import { AffiliateOrdersList } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-orders-list"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { orderViewOf, type AreaWords } from "@/lib/affiliate-area-view"
import { useAffiliateOrders } from "@/services/affiliate-area/affiliate-area-hooks"

export interface AffiliateOrdersSectionProps {
  slug: string
  words: AreaWords
  messages: UiMessages
}

/** The orders credited to the affiliate: who bought by name, what, and the commission. */
export function AffiliateOrdersSection({ slug, words, messages }: AffiliateOrdersSectionProps) {
  const [page, setPage] = useState(1)
  const orders = useAffiliateOrders(slug, page)

  if (orders.isPending) return <Skeleton className="h-72 w-full rounded-xl" />
  if (orders.isError) return <AffiliateAreaNotice kind="failed" onRetry={() => void orders.refetch()} messages={messages} />

  const { data } = orders
  return (
    <AffiliateOrdersList
      orders={data.orders.map((order) => orderViewOf(order, words, messages.affiliateArea.orders, messages.orders.statuses))}
      pager={{ page: data.page, pageSize: data.pageSize, total: data.total }}
      onPage={setPage}
      messages={messages}
    />
  )
}
