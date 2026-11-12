"use client"

// React
import { useState } from "react"

// UI
import { AffiliateAdjustmentDialog } from "@harness-monorepo/ui/blocks/affiliates/affiliate-adjustment-dialog"
import { AffiliateBalanceCard } from "@harness-monorepo/ui/blocks/affiliates/affiliate-balance-card"
import { AffiliatePayoutDialog } from "@harness-monorepo/ui/blocks/affiliates/affiliate-payout-dialog"
import { AffiliateStatement } from "@harness-monorepo/ui/blocks/affiliates/affiliate-statement"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { AffiliateAdjustmentFormValues, AffiliateAdjustmentIssues, AffiliatePayoutFormValues, AffiliatePayoutIssues } from "@harness-monorepo/ui/lib/affiliate-money"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { affiliateErrorOf, payoutDayFormatter } from "@/lib/affiliate-form"
import { EMPTY_ADJUSTMENT, adjustmentPayloadOf, emptyPayoutOf, payoutPayloadOf, shopTodayOf } from "@/lib/affiliate-money-form"
import { affiliateBalanceViewOf, statementRowOf } from "@/lib/affiliate-money-view"
import { affiliateDateFormatter } from "@/lib/affiliate-people"
import { useAdjustAffiliate, useAffiliateStatement, usePayAffiliate } from "@/services/affiliates/affiliate-money-hooks"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"

export interface AffiliateMoneySectionProps {
  slug: string
  affiliateId: string
  pixKey: string | null
  locale: string
  messages: UiMessages
}

type Dialog = { kind: "adjust"; value: AffiliateAdjustmentFormValues; issues: AffiliateAdjustmentIssues } | { kind: "pay"; value: AffiliatePayoutFormValues; issues: AffiliatePayoutIssues }

const codeOf = (error: Error | null): string => (error instanceof AffiliateError ? error.errorCode : "UNKNOWN")

/**
 * What the shop owes one affiliate, on their record (IMPULSEIA-107): the balances, the statement, and
 * the dialogs that adjust it and record a payment made outside bee-link.
 */
export function AffiliateMoneySection({ slug, affiliateId, pixKey, locale, messages }: AffiliateMoneySectionProps) {
  const text = messages.affiliates
  const [page, setPage] = useState(1)
  // Null while no dialog is open: what one edits lives and dies with it.
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const statement = useAffiliateStatement(slug, affiliateId, page)
  const adjust = useAdjustAffiliate(slug, affiliateId)
  const pay = usePayAffiliate(slug, affiliateId)

  if (statement.isPending) return <Skeleton className="h-64 w-full rounded-xl" />
  if (statement.isError) return null

  const money = (cents: number) => formatCents(cents, locale, "BRL")
  const words = { money, day: payoutDayFormatter(locale), date: affiliateDateFormatter(locale), text: text.money }
  const today = shopTodayOf(new Date())
  const done = () => {
    setPage(1)
    setDialog(null)
  }

  function submit() {
    if (dialog?.kind === "adjust") {
      const outcome = adjustmentPayloadOf(dialog.value, text.moneyIssues)
      if ("issues" in outcome) return setDialog({ ...dialog, issues: outcome.issues })
      adjust.mutate(outcome.payload, { onSuccess: done })
    } else if (dialog?.kind === "pay") {
      const outcome = payoutPayloadOf(dialog.value, today, text.moneyIssues)
      if ("issues" in outcome) return setDialog({ ...dialog, issues: outcome.issues })
      pay.mutate(outcome.payload, { onSuccess: done })
    }
  }

  const close = (open: boolean) => (open ? undefined : setDialog(null))
  const errorOf = (error: Error | null) => (error ? affiliateErrorOf(codeOf(error), text.errors) : undefined)

  return (
    <>
      <AffiliateBalanceCard
        balance={affiliateBalanceViewOf(statement.data, money, text.money)}
        ordersHref={`/admin/${slug}/orders?affiliate=${encodeURIComponent(affiliateId)}`}
        onPay={() => {
          pay.reset()
          setDialog({ kind: "pay", value: emptyPayoutOf(statement.data.availableCents, today), issues: {} })
        }}
        onAdjust={() => {
          adjust.reset()
          setDialog({ kind: "adjust", value: EMPTY_ADJUSTMENT, issues: {} })
        }}
        linkComponent={AppLink}
        messages={messages}
      >
        <AffiliateStatement rows={statement.data.entries.map((entry) => statementRowOf(entry, words))} page={statement.data.page} pageSize={statement.data.pageSize} total={statement.data.total} onPage={setPage} messages={messages} />
      </AffiliateBalanceCard>
      <AffiliateAdjustmentDialog
        open={dialog?.kind === "adjust"}
        onOpenChange={close}
        value={dialog?.kind === "adjust" ? dialog.value : EMPTY_ADJUSTMENT}
        onChange={(value) => setDialog({ kind: "adjust", value, issues: {} })}
        onSubmit={submit}
        issues={dialog?.kind === "adjust" ? dialog.issues : undefined}
        pending={adjust.isPending}
        error={errorOf(adjust.error)}
        messages={messages}
      />
      <AffiliatePayoutDialog
        open={dialog?.kind === "pay"}
        onOpenChange={close}
        value={dialog?.kind === "pay" ? dialog.value : emptyPayoutOf(0, today)}
        onChange={(value) => setDialog({ kind: "pay", value, issues: {} })}
        onSubmit={submit}
        available={money(Math.max(0, statement.data.availableCents))}
        maxDay={today}
        pixKey={pixKey}
        issues={dialog?.kind === "pay" ? dialog.issues : undefined}
        pending={pay.isPending}
        error={errorOf(pay.error)}
        messages={messages}
      />
    </>
  )
}
