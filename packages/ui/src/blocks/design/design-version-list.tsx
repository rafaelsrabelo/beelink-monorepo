"use client"

// React
import { useState } from "react"

// UI
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@harness-monorepo/ui/components/alert-dialog"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { DesignVersionRow, type DesignVersion } from "./design-version-row"

export interface DesignVersionListProps {
  /** Newest first. Null while they load. */
  versions: readonly DesignVersion[] | null
  onRestore: (id: string) => void
  restoring: boolean
  /** Why the last restore failed, in the owner's words. */
  error?: string | null
  messages?: UiMessages
}

/**
 * A page's published versions and the way back to one. Restoring asks first, and says what it does
 * and does not do: the draft becomes that version, and the shop changes only at the next Publicar.
 */
export function DesignVersionList({ versions, onRestore, restoring, error = null, messages = defaultMessages }: DesignVersionListProps) {
  const text = messages.design.history
  const [asking, setAsking] = useState<DesignVersion | null>(null)

  return (
    <section aria-labelledby="design-history-heading" className="flex flex-col gap-2">
      <h2 id="design-history-heading" className="text-sm font-semibold">
        {text.heading}
      </h2>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      {versions === null ? (
        <>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </>
      ) : versions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {versions.map((version) => (
            <DesignVersionRow key={version.id} version={version} onRestore={setAsking} restoring={restoring} messages={messages} />
          ))}
        </ul>
      )}

      <AlertDialog open={asking !== null} onOpenChange={(open: boolean) => (open ? undefined : setAsking(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{format(text.restoreTitle, { number: String(asking?.number ?? "") })}</AlertDialogTitle>
            <AlertDialogDescription>{text.restoreBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{text.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (asking) onRestore(asking.id)
                setAsking(null)
              }}
            >
              {restoring ? text.restoring : text.restoreConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
