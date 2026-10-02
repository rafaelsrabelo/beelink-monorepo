"use client"

// React
import { useState } from "react"

// UI
import { CashbackAdjustForm } from "@harness-monorepo/ui/blocks/cashback/cashback-adjust-form"
import { CashbackFailed } from "@harness-monorepo/ui/blocks/cashback/cashback-failed"
import type { CashbackAdjustmentFormValues, CashbackAdjustmentIssues } from "@harness-monorepo/ui/lib/cashback"
import { CustomerCashback } from "@harness-monorepo/ui/blocks/cashback/customer-cashback"
import { TablePager } from "@harness-monorepo/ui/blocks/catalog/table-pager"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { adjustmentPayloadOf, cashbackErrorOf, EMPTY_ADJUSTMENT } from "@/lib/cashback-form"
import { useAdjustCashback, useCustomerCashback } from "@/services/cashback/cashback-hooks"
import { CashbackError } from "@/services/cashback/cashback-requests"

export interface CustomerCashbackSectionProps {
  slug: string
  customerId: string
  locale: string
  messages: UiMessages
}

const NO_ISSUES: CashbackAdjustmentIssues = {}

/**
 * A customer's cashback on their record (BEELINK-242): the balance, what is pending, the statement a
 * page at a time, and the shopkeeper's adjustment, which opens in place of its button and, once
 * posted, shows the statement from its first page — where the new line is.
 */
export function CustomerCashbackSection({ slug, customerId, locale, messages }: CustomerCashbackSectionProps) {
  const text = messages.customers
  const [page, setPage] = useState(1)
  const cashback = useCustomerCashback(slug, customerId, page)
  const adjust = useAdjustCashback(slug, customerId)
  const [adjusting, setAdjusting] = useState<CashbackAdjustmentFormValues | null>(null)
  const [issues, setIssues] = useState<CashbackAdjustmentIssues>(NO_ISSUES)
  const money = (cents: number) => formatCents(cents, locale, "BRL")
  const day = (iso: string) => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso))

  if (cashback.isPending) return <Skeleton aria-hidden="true" className="h-40 rounded-xl" />
  if (cashback.isError) return <CashbackFailed onRetry={() => void cashback.refetch()} messages={messages} />

  function open() {
    adjust.reset()
    setIssues(NO_ISSUES)
    setAdjusting(EMPTY_ADJUSTMENT)
  }

  function change(next: CashbackAdjustmentFormValues) {
    if (adjust.error) adjust.reset()
    setIssues(NO_ISSUES)
    setAdjusting(next)
  }

  function submit() {
    if (!adjusting) return
    const result = adjustmentPayloadOf(adjusting, messages.cashback.issues)
    if ("issues" in result) return setIssues(result.issues)
    adjust.mutate(result.payload, {
      onSuccess: () => {
        setAdjusting(null)
        setPage(1)
      },
    })
  }

  const { data } = cashback
  return (
    <CustomerCashback
      cashback={data}
      money={money}
      date={day}
      onAdjust={open}
      adjustment={
        adjusting ? (
          <CashbackAdjustForm
            value={adjusting}
            onChange={change}
            onSubmit={submit}
            onCancel={() => setAdjusting(null)}
            issues={issues}
            pending={adjust.isPending}
            error={adjust.error ? cashbackErrorOf(adjust.error instanceof CashbackError ? adjust.error.errorCode : "UNKNOWN", messages.cashback.errors) : undefined}
            messages={messages}
          />
        ) : null
      }
      pager={
        data.total > data.pageSize ? (
          <TablePager
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
            busy={cashback.isFetching}
            previousLabel={text.previous}
            nextLabel={text.next}
            rangeLabel={(from, to, total) => format(text.range, { from: String(from), to: String(to), total: String(total) })}
          />
        ) : null
      }
      messages={messages}
    />
  )
}
