"use client"

// Types
import type { ComponentKind, Section } from "@harness-monorepo/contracts"

// UI
import { BlockGallery } from "@harness-monorepo/ui/blocks/design/block-gallery"
import { DesignLeaveDialog } from "@harness-monorepo/ui/blocks/design/design-leave-dialog"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { BandEditor } from "./band-editor"
import { DesignDeleteConfirm, type PendingDelete } from "./design-delete-confirm"
import type { useBlockInsert } from "./use-block-insert"
import type { useDesignDraft } from "./use-design-draft"
import type { useLeaveGuard } from "./use-leave-guard"

import type { WebMessages } from "@/locales"

export interface DesignScreenDialogsProps {
  slug: string
  guard: ReturnType<typeof useLeaveGuard>
  draft: ReturnType<typeof useDesignDraft>
  pendingDelete: PendingDelete | null
  onDeleteDone: () => void
  /** The band whose sheet is open, where it sits, and what the page is painted. */
  editingSection: Section | null
  editingPosition: number
  pageBackground: string
  onBandClose: () => void
  adding: ReturnType<typeof useBlockInsert>
  /** The kinds the gallery never offers here: the strip a page has once, and what this kind of page cannot hold. */
  takenKinds: readonly ComponentKind[]
  unavailableKinds: readonly ComponentKind[]
  messages: UiMessages
  web: WebMessages
}

/**
 * What opens over the editor: the question before leaving, the question before a delete, the band's
 * sheet and the gallery. Apart from the screen because it had reached the line limit.
 */
export function DesignScreenDialogs({
  slug,
  guard,
  draft,
  pendingDelete,
  onDeleteDone,
  editingSection,
  editingPosition,
  pageBackground,
  onBandClose,
  adding,
  takenKinds,
  unavailableKinds,
  messages,
  web,
}: DesignScreenDialogsProps) {
  return (
    <>
      <DesignLeaveDialog open={guard.asking} onStay={guard.stay} onLeave={guard.leave} messages={messages} />

      <DesignDeleteConfirm pending={pendingDelete} draft={draft} onDone={onDeleteDone} messages={messages} web={web} />

      <BandEditor
        slug={slug}
        section={editingSection}
        position={editingPosition}
        pageBackground={pageBackground}
        onClose={onBandClose}
        messages={messages}
      />

      {/*
        The one gallery every "+" opens, already knowing where the block goes. Adding is a saved
        write, not a draft edit — a reload must not lose what the owner watched appear — and the form
        then opens on the block just created, so nothing lands somewhere the owner has to find it.
      */}
      <BlockGallery
        open={adding.insertAt !== null}
        onOpenChange={(open) => (open ? undefined : adding.setInsertAt(null))}
        // The strip is the one kind a page has once; a site has no catalogue, a shop no form leads.
        taken={[...takenKinds]}
        unavailable={adding.unavailableWith(unavailableKinds)}
        onAdd={adding.insert}
        offerRows={adding.insertAt?.level === "band"}
        messages={messages}
      />
    </>
  )
}
