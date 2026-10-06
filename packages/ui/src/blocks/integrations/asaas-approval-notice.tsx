// React
import { useId } from "react"

// Libs
import { TriangleAlertIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import type { AsaasUnapprovedValue } from "@harness-monorepo/ui/lib/integrations"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface AsaasApprovalNoticeProps {
  /** Where the account stands at Asaas: anything but approved. */
  approval: AsaasUnapprovedValue
  /** When Asaas was last asked, already in words; left out when it is not known. */
  checkedAt?: string
  /** Asks Asaas again, now. */
  onRecheck: () => void
  rechecking?: boolean
  /** Asaas was just asked again, and said the same. */
  unchanged?: boolean
  /** Why the last asking did not go through, in words. */
  error?: string
  messages?: UiMessages
}

/**
 * Over a connected Asaas whose account Asaas has not approved (BEELINK-278): which way it stands —
 * registration incomplete, under review, or rejected — what the shopkeeper does about it, and what
 * it means meanwhile: nothing is paid on the site, and the shop sells as before. Asaas approves on
 * its own time, so the way to ask again is here, for the shopkeeper who was just told it did.
 */
export function AsaasApprovalNotice({ approval, checkedAt, onRecheck, rechecking = false, unchanged = false, error, messages = defaultMessages }: AsaasApprovalNoticeProps) {
  const text = messages.integrations.asaas.approval
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className="border-destructive/30 bg-destructive/10 flex flex-col gap-3 rounded-xl border p-4 sm:p-6">
      <div className="flex items-start gap-2">
        <TriangleAlertIcon aria-hidden="true" className="text-destructive mt-0.5 size-5 shrink-0" />
        <h2 id={`${id}-title`} className="font-semibold">
          {text.title[approval]}
        </h2>
      </div>
      <p className="text-sm">{text.body[approval]}</p>
      <p className="text-sm">{text.meanwhile}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={rechecking} aria-busy={rechecking || undefined} onClick={onRecheck}>
          {rechecking ? text.rechecking : text.recheck}
        </Button>
        {checkedAt ? <span className="text-muted-foreground text-sm">{format(text.checkedAt, { when: checkedAt })}</span> : null}
      </div>
      {/* Always there, so what comes of asking is read out when it arrives. */}
      <p role="status" className="text-sm empty:hidden">
        {!rechecking && !error && unchanged ? text.still : null}
      </p>
      {error && !rechecking ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </section>
  )
}
