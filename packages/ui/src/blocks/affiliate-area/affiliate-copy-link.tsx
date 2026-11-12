"use client"

// Libs
import { CheckIcon, CopyIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface AffiliateCopyLinkProps {
  url: string
  /** What the link opens, read out on the button. */
  name: string
  copied: boolean
  onCopy: (url: string) => void
  /** Only the button, for a row that already says what it is. */
  compact?: boolean
  messages?: UiMessages
}

/** A link to share and the way to copy it (IMPULSEIA-108). The clipboard is the screen's to write. */
export function AffiliateCopyLink({ url, name, copied, onCopy, compact = false, messages = defaultMessages }: AffiliateCopyLinkProps) {
  const text = messages.affiliateArea.copy
  const Icon = copied ? CheckIcon : CopyIcon

  return (
    <div className="flex min-w-0 items-center gap-2">
      {compact ? null : <code className="bg-muted min-w-0 flex-1 truncate rounded-md px-3 py-2 text-sm">{url}</code>}
      <Button type="button" variant="outline" size="sm" aria-label={format(text.label, { name })} onClick={() => onCopy(url)}>
        <Icon aria-hidden="true" className="size-4" />
        <span aria-live="polite">{copied ? text.done : text.action}</span>
      </Button>
    </div>
  )
}
