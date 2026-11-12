"use client"

// React
import { useState } from "react"

// UI
import { AffiliatesFailed } from "@harness-monorepo/ui/blocks/affiliates/affiliates-failed"
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { CustomerOrders } from "@harness-monorepo/ui/blocks/customers/customer-orders"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { useOrders } from "@/services/orders/order-hooks"

export interface RecordOrdersTabProps {
  slug: string
  affiliateId: string
  locale: string
  messages: UiMessages
}

/**
 * The record's Pedidos tab (12/11/2026): the orders credited to the affiliate, most recent first,
 * each opening its own page — where its commission is.
 */
export function RecordOrdersTab({ slug, affiliateId, locale, messages }: RecordOrdersTabProps) {
  const text = messages.affiliates.record
  const pager = messages.customers
  const [page, setPage] = useState(1)
  const orders = useOrders(slug, { affiliateId, page })

  if (orders.isError) return <AffiliatesFailed onRetry={() => void orders.refetch()} messages={messages} />

  return (
    <CustomerOrders
      orders={orders.data?.orders ?? []}
      loading={orders.isPending}
      hrefOf={(number) => `/admin/${slug}/orders/${number}`}
      pager={
        orders.data ? (
          <TablePager
            page={orders.data.page}
            pageSize={orders.data.pageSize}
            total={orders.data.total}
            onPageChange={setPage}
            busy={orders.isFetching}
            previousLabel={pager.previous}
            nextLabel={pager.next}
            rangeLabel={(from, to, total) => format(pager.range, { from: String(from), to: String(to), total: String(total) })}
          />
        ) : null
      }
      locale={locale}
      linkComponent={AppLink}
      text={{ title: text.ordersTitle, empty: text.ordersEmpty, emptyHint: text.ordersEmptyHint }}
      messages={messages}
    />
  )
}
