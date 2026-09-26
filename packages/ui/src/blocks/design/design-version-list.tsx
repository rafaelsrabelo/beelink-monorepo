"use client"

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
import { Button } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { DesignVersionRow, type DesignVersion } from "./design-version-row"

export interface DesignVersionListProps {
  /** Newest first. Null while they load, or when they could not be. */
  versions: readonly DesignVersion[] | null
  loadFailed?: boolean
  onRetry?: () => void
  /**
   * The version the owner is being asked about, by id. The screen holds it, so the question stays
   * on screen while the restore runs and closes only once it has landed.
   */
  asking: string | null
  /** A row's Restaurar opens the question; Cancelar closes it with null. */
  onAsk: (id: string | null) => void
  onConfirm: () => void
  restoring: boolean
  /** The version the draft has just become: said once, so the owner knows the shop has not changed. */
  restored?: number | null
  /** Why the restore failed, in the owner's words — said in the question, which is still open. */
  error?: string | null
  messages?: UiMessages
}

/**
 * A page's published versions and the way back to one. Restoring asks first, and says what it does
 * and does not do: the draft becomes that version, and the shop changes only at the next Publicar.
 */
export function DesignVersionList({
  versions,
  loadFailed = false,
  onRetry,
  asking,
  onAsk,
  onConfirm,
  restoring,
  restored = null,
  error = null,
  messages = defaultMessages,
}: DesignVersionListProps) {
  const text = messages.design.history
  const version = versions?.find((row) => row.id === asking) ?? null

  return (
    <section aria-labelledby="design-history-heading" className="flex flex-col gap-2">
      <h2 id="design-history-heading" className="text-sm font-semibold">
        {text.heading}
      </h2>

      <p role="status" className="text-muted-foreground text-sm empty:hidden">
        {restored !== null ? format(text.restored, { number: String(restored) }) : ""}
      </p>

      {versions === null && loadFailed ? (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p className="text-destructive text-sm">{text.loadFailed}</p>
          {onRetry ? (
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              {text.retry}
            </Button>
          ) : null}
        </div>
      ) : versions === null ? (
        <>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </>
      ) : versions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {versions.map((row) => (
            <DesignVersionRow key={row.id} version={row} onRestore={(picked) => onAsk(picked.id)} restoring={restoring} messages={messages} />
          ))}
        </ul>
      )}

      <AlertDialog open={version !== null} onOpenChange={(open: boolean) => (open || restoring ? undefined : onAsk(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{format(text.restoreTitle, { number: String(version?.number ?? "") })}</AlertDialogTitle>
            <AlertDialogDescription>{text.restoreBody}</AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>{text.cancel}</AlertDialogCancel>
            <AlertDialogAction disabled={restoring} onClick={onConfirm}>
              {restoring ? text.restoring : text.restoreConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
