"use client"

// React
import type { ReactNode } from "react"

// Next
import { useRouter, useSearchParams } from "next/navigation"

// UI
import { AffiliateListSection } from "@harness-monorepo/ui/blocks/affiliates/affiliate-list-section"
import { AffiliateRows } from "@harness-monorepo/ui/blocks/affiliates/affiliate-rows"
import { AffiliateStatusTabs } from "@harness-monorepo/ui/blocks/affiliates/affiliate-status-tabs"
import { AffiliatesFailed } from "@harness-monorepo/ui/blocks/affiliates/affiliates-failed"
import { AffiliatesSkeleton } from "@harness-monorepo/ui/blocks/affiliates/affiliates-skeleton"
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { AFFILIATE_STATUS_VALUES, type AffiliateStatusValue } from "@harness-monorepo/ui/lib/affiliates"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { affiliateDateFormatter, affiliateListItemOf } from "@/lib/affiliate-people"
import { useShopAffiliates } from "@/services/affiliates/shop-affiliate-hooks"
import { AffiliatesFrame } from "./affiliates-frame"

export interface AffiliatesListScreenProps {
  slug: string
  locale: string
  messages: UiMessages
}

const statusOf = (raw: string | null): AffiliateStatusValue | null => AFFILIATE_STATUS_VALUES.find((status) => status === raw) ?? null

/**
 * The shop's affiliates (IMPULSEIA-104): filtered by standing and paged in the address, so a reload or
 * the back button keeps the place. Inviting is a page of its own, step by step (12/11/2026).
 */
export function AffiliatesListScreen({ slug, locale, messages }: AffiliatesListScreenProps) {
  const text = messages.affiliates
  const router = useRouter()
  const params = useSearchParams()
  const status = statusOf(params.get("status"))
  const page = Math.max(Number(params.get("page") ?? 1) || 1, 1)
  const list = useShopAffiliates(slug, { status, page })

  function go(nextStatus: AffiliateStatusValue | null, nextPage: number) {
    const query = new URLSearchParams()
    if (nextStatus) query.set("status", nextStatus)
    if (nextPage > 1) query.set("page", String(nextPage))
    const suffix = query.toString()
    router.replace(`/admin/${slug}/affiliates${suffix ? `?${suffix}` : ""}` as Parameters<typeof router.replace>[0])
  }

  const frame = (children: ReactNode) => <AffiliatesFrame slug={slug} active="affiliates" messages={messages}>{children}</AffiliatesFrame>
  if (list.isPending) return frame(<AffiliatesSkeleton shape="list" />)
  if (list.isError) return frame(<AffiliatesFailed onRetry={() => void list.refetch()} messages={messages} />)

  const date = affiliateDateFormatter(locale)
  return frame(
      <AffiliateListSection onInvite={() => router.push(`/admin/${slug}/affiliates/new` as Parameters<typeof router.push>[0])} messages={messages}>
        <AffiliateStatusTabs value={status} onValueChange={(next) => go(next, 1)} messages={messages}>
          <AffiliateRows
            affiliates={list.data.affiliates.map((affiliate) => affiliateListItemOf(affiliate, text.list, date))}
            hrefOf={(affiliateId) => `/admin/${slug}/affiliates/${affiliateId}`}
            filtered={status !== null}
            linkComponent={AppLink}
            messages={messages}
          />
          <TablePager
            page={list.data.page}
            pageSize={list.data.pageSize}
            total={list.data.total}
            busy={list.isFetching}
            onPageChange={(next) => go(status, next)}
            previousLabel={text.list.previous}
            nextLabel={text.list.next}
            rangeLabel={(from, to, total) => format(text.list.range, { from: String(from), to: String(to), total: String(total) })}
          />
        </AffiliateStatusTabs>
      </AffiliateListSection>,
  )
}
