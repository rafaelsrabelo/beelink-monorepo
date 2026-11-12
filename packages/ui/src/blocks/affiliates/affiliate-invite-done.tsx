"use client"

// Libs
import { CheckIcon, CopyIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface AffiliateInviteDoneProps {
  /** The affiliate's own link: `https://…/<loja>/<nome>`. */
  link: string
  onCopy: () => void
  copied?: boolean
  messages?: UiMessages
}

/** The invite accepted (IMPULSEIA-104): the affiliate's link, to copy and share, and what comes next. */
export function AffiliateInviteDone({ link, onCopy, copied = false, messages = defaultMessages }: AffiliateInviteDoneProps) {
  const text = messages.affiliateInvite.done

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{text.body}</p>
      <p className="bg-muted rounded-lg px-3 py-2 font-mono text-sm break-all">{link}</p>
      <Button type="button" variant="outline" onClick={onCopy} className="self-start">
        {copied ? <CheckIcon /> : <CopyIcon />}
        {text.copy}
      </Button>
      <p role="status" className="text-muted-foreground text-sm">
        {copied ? text.copied : ""}
      </p>
      <p className="text-sm">{text.next}</p>
    </div>
  )
}
