"use client"

// React
import { useState, type ReactNode } from "react"

// Next
import { useRouter } from "next/navigation"

// Libs
import { ArrowLeftIcon } from "lucide-react"

// UI
import { AffiliateConfirmDialog, type AffiliateConfirmText } from "@harness-monorepo/ui/blocks/affiliates/affiliate-confirm-dialog"
import { AffiliateRecordActions, type AffiliateAction } from "@harness-monorepo/ui/blocks/affiliates/affiliate-record-actions"
import { AffiliateRecordDetails } from "@harness-monorepo/ui/blocks/affiliates/affiliate-record-details"
import { AffiliateRecordForm } from "@harness-monorepo/ui/blocks/affiliates/affiliate-record-form"
import { AffiliatesFailed } from "@harness-monorepo/ui/blocks/affiliates/affiliates-failed"
import { AffiliatesSkeleton } from "@harness-monorepo/ui/blocks/affiliates/affiliates-skeleton"
import type { AffiliateRecordFormValues, AffiliateRecordIssues } from "@harness-monorepo/ui/lib/affiliates"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AppLink } from "@/components/app-link"
import { affiliateErrorOf } from "@/lib/affiliate-form"
import { affiliateDateFormatter, affiliateLinkOf, affiliateRecordViewOf, affiliateTableOptionsOf, recordFormOf, recordPatchOf } from "@/lib/affiliate-people"
import { useAffiliateProgram } from "@/services/affiliates/affiliate-hooks"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { useActOnAffiliate, useCancelAffiliateInvite, useShopAffiliate, useUpdateAffiliate } from "@/services/affiliates/shop-affiliate-hooks"

export interface AffiliateRecordScreenProps {
  slug: string
  affiliateId: string
  /** This site's origin, which the affiliate's link is spelled with. */
  origin: string
  locale: string
  messages: UiMessages
}

const codeOf = (error: Error | null): string => (error instanceof AffiliateError ? error.errorCode : "UNKNOWN")

/**
 * One affiliate, as the shop keeps them (IMPULSEIA-104): who they are, the table and the note, and
 * the acts their standing allows — asked first when the act does not come back.
 */
export function AffiliateRecordScreen({ slug, affiliateId, origin, locale, messages }: AffiliateRecordScreenProps) {
  const text = messages.affiliates
  const router = useRouter()
  const affiliate = useShopAffiliate(slug, affiliateId)
  const program = useAffiliateProgram(slug)
  const update = useUpdateAffiliate(slug, affiliateId)
  const act = useActOnAffiliate(slug, affiliateId)
  const cancel = useCancelAffiliateInvite(slug, affiliateId)
  const [draft, setDraft] = useState<AffiliateRecordFormValues | null>(null)
  const [issues, setIssues] = useState<AffiliateRecordIssues>({})
  const [saved, setSaved] = useState(false)
  const [asking, setAsking] = useState<"cancel" | "end" | null>(null)
  const [notice, setNotice] = useState("")

  const listHref = `/admin/${slug}/affiliates`
  const frame = (children: ReactNode) => (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 lg:px-6">
      <AppLink href={listHref} className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 self-start text-sm">
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {text.record.back}
      </AppLink>
      {children}
    </div>
  )
  if (affiliate.isPending || program.isPending) return frame(<AffiliatesSkeleton shape="list" />)
  if (affiliate.isError || program.isError) return frame(<AffiliatesFailed onRetry={() => void Promise.all([affiliate.refetch(), program.refetch()])} messages={messages} />)

  const current = affiliate.data
  const savedForm = recordFormOf(current)
  const value = draft ?? savedForm
  const outcome = recordPatchOf(value, savedForm, text.affiliateIssues)
  const view = affiliateRecordViewOf(current, { text: text.record, date: affiliateDateFormatter(locale), link: affiliateLinkOf(origin, slug, current.slug) })
  const busy: AffiliateAction | null = act.isPending ? act.variables : cancel.isPending ? "cancel" : null
  const actionError = act.error ?? cancel.error

  function submit() {
    if ("issues" in outcome) return setIssues(outcome.issues)
    if ("pristine" in outcome) return
    update.mutate(outcome.payload, {
      onSuccess: () => {
        setDraft(null)
        setSaved(true)
      },
    })
  }

  function onAction(action: AffiliateAction) {
    act.reset()
    cancel.reset()
    setNotice("")
    if (action === "cancel" || action === "end") return setAsking(action)
    act.mutate(action, { onSuccess: () => setNotice(action === "resend" ? format(text.record.resent, { email: current.email }) : "") })
  }

  function confirm() {
    if (asking === "cancel") cancel.mutate(undefined, { onSuccess: () => router.replace(listHref as Parameters<typeof router.replace>[0]), onSettled: () => setAsking(null) })
    else if (asking === "end") act.mutate("end", { onSettled: () => setAsking(null) })
  }

  const confirmText: AffiliateConfirmText | null = asking ? { ...text.record[asking === "cancel" ? "cancelConfirm" : "endConfirm"], question: format(text.record[asking === "cancel" ? "cancelConfirm" : "endConfirm"].question, { name: current.name }) } : null

  return frame(
    <>
      <AffiliateRecordDetails affiliate={view} messages={messages} />
      <AffiliateRecordForm
        value={value}
        onChange={(next) => {
          setIssues({})
          setSaved(false)
          setDraft(next)
        }}
        onSubmit={submit}
        tables={affiliateTableOptionsOf(program.data.tables, locale)}
        tableLocked={current.status === "ENDED"}
        issues={issues}
        pending={update.isPending}
        pristine={"pristine" in outcome}
        saved={saved}
        error={update.error ? affiliateErrorOf(codeOf(update.error), text.errors) : undefined}
        messages={messages}
      />
      <AffiliateRecordActions status={current.status} onAction={onAction} busy={busy} notice={notice} error={actionError ? affiliateErrorOf(codeOf(actionError), text.errors) : undefined} messages={messages} />
      <AffiliateConfirmDialog text={confirmText} keepLabel={text.record.keep} onConfirm={confirm} onCancel={() => setAsking(null)} pending={busy === "cancel" || busy === "end"} />
    </>,
  )
}
