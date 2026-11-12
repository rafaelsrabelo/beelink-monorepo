"use client"

// React
import { useState } from "react"

// Types
import type { AffiliateProgramOverview, ShopAffiliate } from "@harness-monorepo/contracts"

// UI
import { AffiliateCommissionTab } from "@harness-monorepo/ui/blocks/affiliates/affiliate-commission-tab"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { affiliateErrorOf } from "@/lib/affiliate-form"
import { affiliateCommissionViewOf, affiliateTableOptionsOf } from "@/lib/affiliate-people"
import { useCommissionTable } from "@/services/affiliates/affiliate-hooks"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { useUpdateAffiliate } from "@/services/affiliates/shop-affiliate-hooks"
import { useProductCategories } from "@/services/catalog/catalog-hooks"

export interface RecordCommissionTabProps {
  slug: string
  affiliate: ShopAffiliate
  tables: AffiliateProgramOverview["tables"]
  locale: string
  messages: UiMessages
}

const codeOf = (error: Error): string => (error instanceof AffiliateError ? error.errorCode : "UNKNOWN")

/**
 * The record's Comissão tab (12/11/2026): the table the affiliate is on, changed and saved here or
 * made their own from it, and what it pays — read from the table and the shop's categories.
 */
export function RecordCommissionTab({ slug, affiliate, tables, locale, messages }: RecordCommissionTabProps) {
  const text = messages.affiliates
  const update = useUpdateAffiliate(slug, affiliate.id)
  const makeOwn = useUpdateAffiliate(slug, affiliate.id)
  const table = useCommissionTable(slug, affiliate.table.id)
  const categories = useProductCategories(slug)
  // Null while the select shows the saved table.
  const [chosen, setChosen] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const tableId = chosen ?? affiliate.table.id
  const tableHref = `/admin/${slug}/affiliates/tables/${affiliate.table.id}`
  const shared = !affiliate.table.personal && table.data ? table.data : null
  const error = update.error ?? makeOwn.error

  return (
    <AffiliateCommissionTab
      tables={affiliateTableOptionsOf(tables, locale, affiliate.table.personal ? { tableId: affiliate.table.id, label: text.record.ownCommission } : undefined)}
      tableId={tableId}
      onTable={(next) => {
        update.reset()
        setSaved(false)
        setChosen(next === affiliate.table.id ? null : next)
      }}
      onSaveTable={() =>
        update.mutate(
          { tableId },
          {
            onSuccess: () => {
              setChosen(null)
              setSaved(true)
            },
          },
        )
      }
      tableChanged={tableId !== affiliate.table.id}
      tableLocked={affiliate.status === "ENDED"}
      own={affiliate.table.personal ? { editHref: tableHref } : null}
      onMakeOwn={shared ? () => makeOwn.mutate({ commission: { defaultRateBps: shared.defaultRateBps, categoryRates: shared.categoryRates, productRates: shared.rates } }) : undefined}
      makingOwn={makeOwn.isPending}
      tableHref={tableHref}
      commission={table.data && categories.data ? affiliateCommissionViewOf(table.data, categories.data, locale) : null}
      pending={update.isPending}
      saved={saved}
      error={error ? affiliateErrorOf(codeOf(error), text.errors) : undefined}
      linkComponent={AppLink}
      messages={messages}
    />
  )
}
