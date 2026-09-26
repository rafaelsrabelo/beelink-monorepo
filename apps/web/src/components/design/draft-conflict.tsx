"use client"

// UI
import { DesignConflictDialog } from "@harness-monorepo/ui/blocks/design/design-conflict-dialog"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useDraftRevision } from "@/stores/draft-revision"

/**
 * The editor's answer to a 409 from any draft write: another tab changed the page, so this one
 * reloads. Nothing is lost by it — every change this tab made before was saved to the draft.
 */
export function DraftConflict({ messages }: { messages: UiMessages }) {
  const stale = useDraftRevision((state) => state.stale)

  return <DesignConflictDialog open={stale} onReload={() => window.location.reload()} messages={messages} />
}
