"use client"

// React
import { useState } from "react"

// Types
import type { CommissionTable } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { CommissionGeneralRate } from "@harness-monorepo/ui/blocks/affiliates/commission-general-rate"
import { ratePercentOf } from "@harness-monorepo/ui/lib/cashback"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { affiliateErrorOf, commissionRateOf } from "@/lib/affiliate-form"
import { percentFrom } from "@/lib/discount-form"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { useUpdateCommissionTable } from "@/services/affiliates/affiliate-hooks"

export interface CommissionGeneralRateSectionProps {
  slug: string
  table: CommissionTable
  locale: string
  messages: UiMessages
}

/**
 * A table's general rate, edited on the table's own screen (the user's review, 12/11/2026): the
 * Padrão's was only behind a pencil in the list, and read as fixed. The name stays as it is.
 */
export function CommissionGeneralRateSection({ slug, table, locale, messages }: CommissionGeneralRateSectionProps) {
  const text = messages.affiliates
  const update = useUpdateCommissionTable(slug)
  const [draft, setDraft] = useState<string | null>(null)
  const [issue, setIssue] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const saved = percentFrom(table.defaultRateBps)
  const value = draft ?? saved

  function submit() {
    const rateBps = commissionRateOf(value)
    // Empty is no rate at all here: a table always has its general one.
    if (rateBps === undefined || rateBps === null) return setIssue(text.issues.rate)
    update.mutate(
      { tableId: table.id, payload: { name: table.name, defaultRateBps: rateBps } },
      {
        onSuccess: () => {
          setDraft(null)
          setStatus(format(text.table.generalSaved, { rate: ratePercentOf(rateBps, locale) }))
        },
        onError: (error) => setStatus(affiliateErrorOf(error instanceof AffiliateError ? error.errorCode : "UNKNOWN", text.errors)),
      },
    )
  }

  return (
    <CommissionGeneralRate
      value={value}
      onChange={(next) => {
        setIssue(undefined)
        setStatus(undefined)
        setDraft(next)
      }}
      onSubmit={submit}
      pristine={value.trim() === saved}
      pending={update.isPending}
      issue={issue}
      status={status}
      messages={messages}
    />
  )
}
