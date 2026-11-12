// Libs
import { MailIcon, PauseIcon, PlayIcon, UserXIcon, XIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateStatusValue } from "@harness-monorepo/ui/lib/affiliates"

/** What can be done to an affiliate, by where they stand. */
export type AffiliateAction = "resend" | "cancel" | "pause" | "resume" | "end"

const ACTIONS: Record<AffiliateStatusValue, readonly AffiliateAction[]> = {
  INVITED: ["resend", "cancel"],
  ACTIVE: ["pause", "end"],
  PAUSED: ["resume", "end"],
  ENDED: [],
}

export interface AffiliateRecordActionsProps {
  status: AffiliateStatusValue
  onAction: (action: AffiliateAction) => void
  /** The action in flight: every button waits, and it says so. */
  busy?: AffiliateAction | null
  /** What the last action did, in words. */
  notice?: string
  /** The API's refusal, in words. */
  error?: string
  messages?: UiMessages
}

/**
 * The acts on an affiliate (IMPULSEIA-104), only those their standing allows: an open invite is sent
 * again or cancelled; a seller is paused, resumed or ended. An ended one has none.
 */
export function AffiliateRecordActions({ status, onAction, busy = null, notice, error, messages = defaultMessages }: AffiliateRecordActionsProps) {
  const text = messages.affiliates.record
  const button = (action: AffiliateAction) => {
    const look = {
      resend: { label: busy === "resend" ? text.resending : text.resend, icon: <MailIcon />, variant: "outline" as const },
      cancel: { label: text.cancelInvite, icon: <XIcon />, variant: "ghost" as const },
      pause: { label: text.pause, icon: <PauseIcon />, variant: "outline" as const },
      resume: { label: text.resume, icon: <PlayIcon />, variant: "outline" as const },
      end: { label: text.end, icon: <UserXIcon />, variant: "ghost" as const },
    }[action]
    return (
      <Button key={action} type="button" variant={look.variant} disabled={busy !== null} onClick={() => onAction(action)} className={action === "cancel" || action === "end" ? "text-destructive" : undefined}>
        {look.icon}
        {busy !== null && busy === action && action !== "resend" ? text.busy : look.label}
      </Button>
    )
  }

  return (
    <section aria-labelledby="affiliate-actions-title" className="bg-shell-surface border-shell-border flex flex-col gap-3 rounded-xl border p-4 shadow-xs sm:p-6">
      <h2 id="affiliate-actions-title" className="font-semibold">
        {text.actions}
      </h2>
      {ACTIONS[status].length > 0 ? <div className="flex flex-wrap gap-2">{ACTIONS[status].map(button)}</div> : <p className="text-muted-foreground text-sm">{text.endedHint}</p>}
      <p role="status" className="text-muted-foreground text-sm">
        {notice ?? ""}
      </p>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </section>
  )
}
