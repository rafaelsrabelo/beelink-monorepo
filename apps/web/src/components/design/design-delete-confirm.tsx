"use client"

// UI
import { ConfirmDelete } from "@harness-monorepo/ui/blocks/shared/confirm-delete"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { WebMessages } from "@/locales"

// App
import { pageErrorCopy } from "./page-error-copy"
import type { useDesignDraft } from "./use-design-draft"

/** What the dialog is about to delete. A band takes everything in it; a component leaves its band. */
export type PendingDelete = { level: "band" | "component"; id: string; name: string }

export interface DesignDeleteConfirmProps {
  pending: PendingDelete | null
  draft: ReturnType<typeof useDesignDraft>
  onDone: () => void
  messages: UiMessages
  web: WebMessages
}

/** The question before a band or a block is deleted. It stays open until the server agrees. */
export function DesignDeleteConfirm({ pending, draft, onDone, messages, web }: DesignDeleteConfirmProps) {
  const text = messages.design

  return (
    <ConfirmDelete
      question={
        pending
          ? format(pending.level === "band" ? text.deleteBandConfirm : text.deleteBlockConfirm, { name: pending.name })
          : null
      }
      pending={draft.deleting}
      // A refusal is said under the question.
      {...(draft.deleteError ? { detail: pageErrorCopy(draft.deleteError, web) } : {})}
      onConfirm={() => {
        if (!pending) return
        if (pending.level === "band") draft.removeBand(pending.id, onDone)
        else draft.removeRow(pending.id, onDone)
      }}
      onCancel={() => {
        onDone()
        draft.clearDeleteError()
      }}
      messages={messages}
    />
  )
}
