"use client"

// React
import { useState } from "react"

// UI
import { AffiliateSettingsForm } from "@harness-monorepo/ui/blocks/affiliates/affiliate-settings-form"
import { AffiliatesFailed } from "@harness-monorepo/ui/blocks/affiliates/affiliates-failed"
import { AffiliatesSkeleton } from "@harness-monorepo/ui/blocks/affiliates/affiliates-skeleton"
import type { AffiliateSettingsFormValues, AffiliateSettingsIssues } from "@harness-monorepo/ui/lib/affiliates"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { affiliateErrorOf, affiliateSettingsFormOf, affiliateSettingsPayloadOf, payoutCalendarOf, payoutDayFormatter } from "@/lib/affiliate-form"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { useAffiliateProgram, useSaveAffiliateProgram } from "@/services/affiliates/affiliate-hooks"
import { AffiliatesFrame } from "./affiliates-frame"

export interface AffiliateSettingsScreenProps {
  slug: string
  locale: string
  messages: UiMessages
}

const NO_ISSUES: AffiliateSettingsIssues = {}

/**
 * The shop's affiliate programme (IMPULSEIA-102). The form starts from the rules as saved and holds
 * what is typed until it is saved again; the month's calendar under the delay follows every keystroke.
 */
export function AffiliateSettingsScreen({ slug, locale, messages }: AffiliateSettingsScreenProps) {
  const text = messages.affiliates
  const overview = useAffiliateProgram(slug)
  const save = useSaveAffiliateProgram(slug)
  // What was typed since the rules were read; null shows the saved rules.
  const [typed, setTyped] = useState<AffiliateSettingsFormValues | null>(null)
  const [issues, setIssues] = useState<AffiliateSettingsIssues>(NO_ISSUES)

  if (overview.isPending) return <AffiliatesFrame slug={slug} active="settings" messages={messages}><AffiliatesSkeleton /></AffiliatesFrame>
  if (overview.isError) return <AffiliatesFrame slug={slug} active="settings" messages={messages}><AffiliatesFailed onRetry={() => void overview.refetch()} messages={messages} /></AffiliatesFrame>

  const value = typed ?? affiliateSettingsFormOf(overview.data.program)

  function change(next: AffiliateSettingsFormValues) {
    if (save.error || save.isSuccess) save.reset()
    setIssues(NO_ISSUES)
    setTyped(next)
  }

  function submit() {
    const result = affiliateSettingsPayloadOf(value, text.issues)
    if ("issues" in result) return setIssues(result.issues)
    save.mutate(result.payload, { onSuccess: () => setTyped(null) })
  }

  return (
    <AffiliatesFrame slug={slug} active="settings" messages={messages}>
      <AffiliateSettingsForm
        value={value}
        onChange={change}
        onSubmit={submit}
        issues={issues}
        calendar={payoutCalendarOf(overview.data.periods, value.payoutDelayDays, payoutDayFormatter(locale))}
        pending={save.isPending}
        error={save.error ? affiliateErrorOf(save.error instanceof AffiliateError ? save.error.errorCode : "UNKNOWN", text.errors) : undefined}
        saved={save.isSuccess}
        messages={messages}
      />
    </AffiliatesFrame>
  )
}
