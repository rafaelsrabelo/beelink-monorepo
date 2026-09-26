"use client"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** A version as the history draws it: its date already written for the reader by the screen. */
export interface DesignVersion {
  id: string
  number: number
  /** "26/09/2026 14:30". */
  when: string
  author: string | null
  note: string | null
  live: boolean
}

export interface DesignVersionRowProps {
  version: DesignVersion
  onRestore: (version: DesignVersion) => void
  restoring: boolean
  messages?: UiMessages
}

/** One published version: which, when, by whom, the note left with it, and the way back to it. */
export function DesignVersionRow({ version, onRestore, restoring, messages = defaultMessages }: DesignVersionRowProps) {
  const text = messages.design.history
  const title = format(text.version, { number: String(version.number) })

  return (
    <li className="border-border flex items-start justify-between gap-2 rounded-lg border p-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {title}
          {version.live ? <Badge variant="secondary">{text.live}</Badge> : null}
        </span>
        <span className="text-muted-foreground text-xs">
          {version.author ? format(text.by, { when: version.when, author: version.author }) : version.when}
        </span>
        {version.note ? <span className="truncate text-xs">{version.note}</span> : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={restoring}
        aria-label={`${text.restore} ${title}`}
        onClick={() => onRestore(version)}
      >
        {text.restore}
      </Button>
    </li>
  )
}
