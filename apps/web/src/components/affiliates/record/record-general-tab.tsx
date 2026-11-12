"use client"

// React
import { useState } from "react"

// Types
import type { ShopAffiliate } from "@harness-monorepo/contracts"

// UI
import { AffiliateGeneralTab, type AffiliateEditableField } from "@harness-monorepo/ui/blocks/affiliates/affiliate-general-tab"
import type { AffiliateRecordView } from "@harness-monorepo/ui/lib/affiliates"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { affiliateErrorOf } from "@/lib/affiliate-form"
import { identityMissingOf, recordFormOf, recordPatchOf } from "@/lib/affiliate-people"
import { useClearAffiliateShowcase } from "@/services/affiliates/affiliate-money-hooks"
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { useUpdateAffiliate } from "@/services/affiliates/shop-affiliate-hooks"

export interface RecordGeneralTabProps {
  slug: string
  affiliate: ShopAffiliate
  view: AffiliateRecordView
  messages: UiMessages
}

const codeOf = (error: Error): string => (error instanceof AffiliateError ? error.errorCode : "UNKNOWN")

/**
 * The record's Geral tab (12/11/2026): one row edited at a time — the phone, the CPF or the note —
 * saved alone, and the photo and the phrase taken off the shop window.
 */
export function RecordGeneralTab({ slug, affiliate, view, messages }: RecordGeneralTabProps) {
  const text = messages.affiliates
  const update = useUpdateAffiliate(slug, affiliate.id)
  const clear = useClearAffiliateShowcase(slug, affiliate.id)
  const [editing, setEditing] = useState<AffiliateEditableField | null>(null)
  const [draft, setDraft] = useState("")
  const [issue, setIssue] = useState<string | undefined>(undefined)
  const saved = recordFormOf(affiliate)

  function onEdit(field: AffiliateEditableField) {
    update.reset()
    setIssue(undefined)
    setDraft(saved[field])
    setEditing(field)
  }

  function onSave() {
    if (!editing) return
    const outcome = recordPatchOf({ ...saved, [editing]: draft }, saved, text.affiliateIssues)
    if ("issues" in outcome) return setIssue(outcome.issues[editing])
    if ("pristine" in outcome) return setEditing(null)
    update.mutate(outcome.payload, { onSuccess: () => setEditing(null) })
  }

  const error = update.error ?? clear.error

  return (
    <AffiliateGeneralTab
      affiliate={view}
      identityMissing={identityMissingOf(affiliate)}
      editing={editing}
      draft={draft}
      onEdit={onEdit}
      onDraft={(next) => {
        setIssue(undefined)
        setDraft(next)
      }}
      onSave={onSave}
      onCancel={() => setEditing(null)}
      issue={issue}
      pending={update.isPending}
      onRemovePhoto={() => clear.mutate("photo")}
      onRemoveTagline={() => clear.mutate("tagline")}
      removing={clear.isPending ? (clear.variables ?? null) : null}
      error={error ? affiliateErrorOf(codeOf(error), text.errors) : undefined}
      messages={messages}
    />
  )
}
