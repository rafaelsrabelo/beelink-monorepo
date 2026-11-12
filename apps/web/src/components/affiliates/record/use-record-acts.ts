"use client"

// React
import { useState } from "react"

// Next
import { useRouter } from "next/navigation"

// UI
import type { AffiliateConfirmText } from "@harness-monorepo/ui/blocks/affiliates/affiliate-confirm-dialog"
import type { AffiliateAction } from "@harness-monorepo/ui/blocks/affiliates/affiliate-record-header"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { useActOnAffiliate, useCancelAffiliateInvite } from "@/services/affiliates/shop-affiliate-hooks"

export interface RecordActs {
  onAction: (action: AffiliateAction) => void
  confirm: () => void
  keep: () => void
  busy: AffiliateAction | null
  notice: string
  /** The API's refusal of the last act, as its code; null when none. */
  errorCode: string | null
  confirmText: AffiliateConfirmText | null
}

/**
 * The acts on an affiliate from their record's header (12/11/2026): sent again or paused at once,
 * cancelled or ended only after asking — and a cancelled invite leaves the record for the list.
 */
export function useRecordActs(slug: string, affiliate: { id: string; name: string; email: string }, listHref: string, messages: UiMessages): RecordActs {
  const text = messages.affiliates.record
  const router = useRouter()
  const act = useActOnAffiliate(slug, affiliate.id)
  const cancel = useCancelAffiliateInvite(slug, affiliate.id)
  const [asking, setAsking] = useState<"cancel" | "end" | null>(null)
  const [notice, setNotice] = useState("")
  const error = act.error ?? cancel.error

  function onAction(action: AffiliateAction) {
    act.reset()
    cancel.reset()
    setNotice("")
    if (action === "cancel" || action === "end") return setAsking(action)
    act.mutate(action, { onSuccess: () => setNotice(action === "resend" ? format(text.resent, { email: affiliate.email }) : "") })
  }

  function confirm() {
    if (asking === "cancel") cancel.mutate(undefined, { onSuccess: () => router.replace(listHref as Parameters<typeof router.replace>[0]), onSettled: () => setAsking(null) })
    else if (asking === "end") act.mutate("end", { onSettled: () => setAsking(null) })
  }

  const words = asking ? text[asking === "cancel" ? "cancelConfirm" : "endConfirm"] : null

  return {
    onAction,
    confirm,
    keep: () => setAsking(null),
    busy: act.isPending ? act.variables : cancel.isPending ? "cancel" : null,
    notice,
    errorCode: error ? (error instanceof AffiliateError ? error.errorCode : "UNKNOWN") : null,
    confirmText: words ? { ...words, question: format(words.question, { name: affiliate.name }) } : null,
  }
}
