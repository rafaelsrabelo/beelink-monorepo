"use client"

// React
import { useState } from "react"

// UI
import { AffiliateAreaNotice } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-area-notice"
import { AffiliatePayoutsList } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-payouts-list"
import { AffiliateStatement } from "@harness-monorepo/ui/blocks/affiliates/affiliate-statement"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { payoutViewOf, type AreaWords } from "@/lib/affiliate-area-view"
import { statementRowOf } from "@/lib/affiliate-money-view"
import { useAffiliatePayouts, useMyAffiliateStatement } from "@/services/affiliate-area/affiliate-area-hooks"

export interface AffiliateStatementSectionProps {
  slug: string
  words: AreaWords
  messages: UiMessages
}

/** The statement — the shop's own lines, read in the shop's words — and the payouts it registered. */
export function AffiliateStatementSection({ slug, words, messages }: AffiliateStatementSectionProps) {
  const [pages, setPages] = useState({ statement: 1, payouts: 1 })
  const statement = useMyAffiliateStatement(slug, pages.statement)
  const payouts = useAffiliatePayouts(slug, pages.payouts)
  const money = messages.affiliates.money

  if (statement.isPending || payouts.isPending) return <Skeleton className="h-72 w-full rounded-xl" />
  if (statement.isError || payouts.isError) {
    return <AffiliateAreaNotice kind="failed" onRetry={() => void Promise.all([statement.refetch(), payouts.refetch()])} messages={messages} />
  }

  return (
    <div className="bg-shell-surface border-shell-border flex flex-col gap-6 rounded-xl border p-4 shadow-xs sm:p-6">
      <p className="text-muted-foreground text-sm">{messages.affiliateArea.statementIntro}</p>
      <AffiliateStatement
        rows={statement.data.entries.map((entry) => statementRowOf(entry, { ...words, text: money }))}
        page={statement.data.page}
        pageSize={statement.data.pageSize}
        total={statement.data.total}
        onPage={(page) => setPages((current) => ({ ...current, statement: page }))}
        messages={messages}
      />
      <AffiliatePayoutsList
        payouts={payouts.data.payouts.map((payout) => payoutViewOf(payout, words, money.methods))}
        pager={{ page: payouts.data.page, pageSize: payouts.data.pageSize, total: payouts.data.total }}
        onPage={(page) => setPages((current) => ({ ...current, payouts: page }))}
        messages={messages}
      />
    </div>
  )
}
