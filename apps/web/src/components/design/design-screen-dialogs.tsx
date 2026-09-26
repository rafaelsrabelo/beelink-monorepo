"use client"

// React
import { useEffect, useState } from "react"

// Types
import type { ComponentKind, PublicProductCategory, PublicStore, StorePage } from "@harness-monorepo/contracts"
import type { InsertAt } from "@harness-monorepo/ui/blocks/design/band-arrangement"

// UI
import { SectionGallery } from "@harness-monorepo/ui/blocks/design/section-gallery"
import { DesignLeaveDialog } from "@harness-monorepo/ui/blocks/design/design-leave-dialog"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { DesignDeleteConfirm, type PendingDelete } from "./design-delete-confirm"
import type { Shelves } from "./design-draft-preview"
import { placementOf } from "./gallery-placement"
import { GalleryPreview } from "./gallery-preview"
import { DraftConflict } from "./draft-conflict"
import { NewLanding } from "./new-landing"
import { PublishPage } from "./publish-page"
import { PageSettings } from "./page-settings"
import { previewable, stockOf } from "./gallery-samples"
import type { useBlockInsert } from "./use-block-insert"
import type { useDesignDraft } from "./use-design-draft"
import type { useLeaveGuard } from "./use-leave-guard"

import type { WebMessages } from "@/locales"
import { useDesignPages } from "@/stores/design-pages"

export interface DesignScreenDialogsProps {
  guard: ReturnType<typeof useLeaveGuard>
  draft: ReturnType<typeof useDesignDraft>
  pendingDelete: PendingDelete | null
  onDeleteDone: () => void
  adding: ReturnType<typeof useBlockInsert>
  /** The kinds the gallery never offers here: the strip a page has once, and what this kind of page cannot hold. */
  takenKinds: readonly ComponentKind[]
  unavailableKinds: readonly ComponentKind[]
  /** The showcases' categories and products: the placement line names an untitled one by its category, and the previews draw them. */
  shelves: Shelves
  /** What the gallery's previews draw with besides: the shop, its categories, the palette being edited. */
  gallery: {
    store: PublicStore
    categories: readonly PublicProductCategory[]
    colors: PublicStore["colors"]
  }
  /** The page being edited: Publicar freezes it, and its settings reload the screen's read. */
  page: StorePage
  messages: UiMessages
  web: WebMessages
}

/**
 * What opens over the editor: the question before leaving, the question before a delete, the
 * gallery and the page dialogs. Apart from the screen because it had reached the line limit.
 */
export function DesignScreenDialogs({
  guard,
  draft,
  pendingDelete,
  onDeleteDone,
  adding,
  takenKinds,
  unavailableKinds,
  shelves,
  gallery,
  page,
  messages,
  web,
}: DesignScreenDialogsProps) {
  // The last "+" pressed, kept while the gallery fades out after Adicionar: read from `insertAt`, which
  // is null by then, its line would turn generic and its rows and shelves change as it disappears.
  const [shownAt, setShownAt] = useState<InsertAt | null>(null)
  // A page dialog left open does not outlive the editor: the store is the module's, and the next
  // editor — another shop's, even — would open on it unasked.
  useEffect(() => () => useDesignPages.getState().close(), [])
  if (adding.insertAt && adding.insertAt !== shownAt) setShownAt(adding.insertAt)
  const placement = placementOf(shownAt, draft.rows, draft.saved, shelves, messages)
  const stock = stockOf(gallery.store, shelves, gallery.categories.length)

  return (
    <>
      <DesignLeaveDialog open={guard.asking} onStay={guard.stay} onLeave={guard.leave} messages={messages} />
      <DraftConflict messages={messages} />

      <DesignDeleteConfirm pending={pendingDelete} draft={draft} onDone={onDeleteDone} messages={messages} web={web} />
      <NewLanding slug={gallery.store.slug} site={gallery.store.type === "INSTITUTIONAL"} go={guard.go} messages={messages} web={web} />
      <PageSettings slug={gallery.store.slug} currentPageId={page.id} messages={messages} web={web} />
      <PublishPage slug={gallery.store.slug} page={page} draft={draft} messages={messages} web={web} />

      {/*
        The one gallery every "+" opens, already knowing where the block goes. Adding is a saved
        write, not a draft edit — a reload must not lose what the owner watched appear — and the form
        then opens on the block just created, so nothing lands somewhere the owner has to find it.
      */}
      <SectionGallery
        open={adding.insertAt !== null}
        onOpenChange={(open) => (open ? undefined : adding.setInsertAt(null))}
        // The strip is the one kind a page has once; a site has no catalogue, a shop no form leads.
        taken={[...takenKinds]}
        unavailable={adding.unavailableWith(unavailableKinds, shownAt)}
        onAdd={adding.insert}
        offerRows={shownAt?.level === "band"}
        {...(placement ? { placement } : {})}
        // Null where the shop has nothing to draw it with, so the card keeps its wireframe: an element that
        // renders nothing would still be a preview, and an empty one.
        renderPreview={(entry) =>
          previewable(entry, stock, messages) ? (
            <GalleryPreview
              entry={entry}
              store={gallery.store}
              categories={gallery.categories}
              stock={stock}
              colors={gallery.colors}
              messages={messages}
            />
          ) : null
        }
        pending={adding.inserting}
        messages={messages}
      />
    </>
  )
}
