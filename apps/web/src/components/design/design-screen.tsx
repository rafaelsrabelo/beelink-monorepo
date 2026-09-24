"use client"

// React
import { useState } from "react"

// Types
import type { ComponentKind, PublicProductCategory, PublicStore, StoreColors } from "@harness-monorepo/contracts"

// UI
import { ConfirmDelete } from "@harness-monorepo/ui/blocks/shared/confirm-delete"
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { HomeBand } from "@/lib/storefront-data"
import { useCreateComponent, useCreateSection } from "@/services/page/page-hooks"
import { useStoreColorPresets, useUpdateStoreColors } from "@/services/stores/store-hooks"
import { BandEditor } from "./band-editor"
import { ComponentEditor } from "./component-editor"
import { DesignPanel } from "./design-panel"
import { BlockGallery } from "@harness-monorepo/ui/blocks/design/block-gallery"

// App
import { DesignPreviewPane } from "./design-preview-pane"
import { applyComponentOrder, applyOrder, componentsOf, labelOf, orderedIdsOf } from "./design-draft"
import { arrangementOf, previewOf } from "./design-draft-preview"
import { pageErrorCopy } from "./page-error-copy"
import { useDesignDraft } from "./use-design-draft"

import type { WebMessages } from "@/locales"

export interface DesignScreenProps {
  /**
   * The shop exactly as a visitor is served it, fetched by the page through the same functions the
   * storefront itself uses. It is not the owner's `Store`: that one carries an address the window
   * would then draw, and counts the shop window never shows.
   */
  store: PublicStore
  categories: readonly PublicProductCategory[]
  /** The rails, already loaded — the same shape the shop window's home is built from. */
  bands: readonly HomeBand[]
  year: number
  messages: UiMessages
  /** The app's own sentences — where an API `errorCode` becomes copy. */
  web: WebMessages
}

/** Spelled out so a fifth colour is a compile error here rather than a field nobody compares. */
const COLOUR_KEYS = ["background", "primary", "header", "footer"] as const satisfies readonly (keyof StoreColors)[]

/** What the dialog is about to delete. A band takes everything in it; a component leaves its band. */
type PendingDelete = { level: "band" | "component"; id: string; name: string }

/**
 * The shop on the left, its bands arranged on the right.
 *
 * The arrangement is a draft until Publish — `useDesignDraft` says why. What a component says, and
 * what colour a band is, save on their own the moment the owner hits save in the sheet: those are
 * things they want to see land, not an order to hold back.
 */
export function DesignScreen({ store, categories, bands, year, messages, web }: DesignScreenProps) {
  const text = messages.design
  const slug = store.slug

  const draft = useDesignDraft(slug)
  const presets = useStoreColorPresets()
  const saveColors = useUpdateStoreColors(slug)
  const addSection = useCreateSection(slug)
  const addToBand = useCreateComponent(slug)


  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [editingComponent, setEditingComponent] = useState<string | null>(null)
  const [editingBand, setEditingBand] = useState<string | null>(null)

  /*
    The palette is its own draft, and it saves on its own — a colour is the kind of thing you want
    to see land, and `PUT /stores/:slug/colors` exists precisely so a colour save never re-posts
    the whole shop over whatever another screen just wrote.
  */
  const [palette, setPalette] = useState<StoreColors>(store.colors)
  const paletteChanged = COLOUR_KEYS.some((key) => palette[key] !== store.colors[key])

  const { rows, saved } = draft

  // The two the shop may only have one of, and the two a page of this kind cannot hold. Computed
  // once because the gallery is now offered from two places — the top of the panel, and each
  // band's foot — and a kind refused in one and offered in the other would be a bug with no
  // symptom until the API answered 409.
  const unavailableKinds: ComponentKind[] =
    store.type === "INSTITUTIONAL" ? ["PRODUCTS", "CATEGORIES"] : ["CONTACT"]
  const takenKinds = componentsOf(rows)
    .map((component) => component.kind)
    .filter((kind) => kind === "ANNOUNCEMENT" || kind === "PRODUCTS")
  const bandName = (id: string) =>
    format(text.bandNumber, { position: String(rows.findIndex((row) => row.id === id) + 1) })

  const editing = saved.flatMap((section) => section.components).find((c) => c.id === editingComponent) ?? null
  const editingSection = saved.find((section) => section.id === editingBand) ?? null

  return (
    <div className="flex w-full flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {/*
            `changed` and not `dirty`: the badge answers the diff against the server, so moving a
            band and moving it back stops claiming there is something to publish — and Publish
            stops being enabled for a write that would send nothing.
          */}
          {draft.changed ? <Badge variant="outline">{text.unpublished}</Badge> : null}
          {draft.changed ? (
            <Button type="button" variant="ghost" disabled={draft.publishing} onClick={draft.discard}>
              {text.discard}
            </Button>
          ) : null}
          <Button type="button" disabled={!draft.changed || draft.publishing} onClick={draft.publish}>
            {draft.publishing ? text.publishing : text.publish}
          </Button>
        </div>
      </header>

      {draft.changed ? <p className="text-muted-foreground text-sm">{text.leaveWarning}</p> : null}

      <ConfirmDelete
        question={
          pendingDelete
            ? format(pendingDelete.level === "band" ? text.deleteBandConfirm : text.deleteBlockConfirm, {
                name: pendingDelete.name,
              })
            : null
        }
        pending={draft.deleting}
        // The dialog stays open until the server agrees; a refusal is said under the question.
        {...(draft.deleteError ? { detail: pageErrorCopy(draft.deleteError, web) } : {})}
        onConfirm={() => {
          if (!pendingDelete) return
          const { level, id } = pendingDelete
          const done = () => setPendingDelete(null)
          if (level === "band") draft.removeBand(id, done)
          else draft.removeRow(id, done)
        }}
        onCancel={() => {
          setPendingDelete(null)
          draft.clearDeleteError()
        }}
        messages={messages}
      />

      <ComponentEditor
        slug={slug}
        component={editing}
        bandBackground={saved.find((section) => section.id === editing?.sectionId)?.background ?? null}
        pageBackground={palette.background}
        onClose={() => setEditingComponent(null)}
        messages={messages}
      />
      <BandEditor
        slug={slug}
        section={editingSection}
        position={rows.findIndex((row) => row.id === editingBand) + 1}
        pageBackground={palette.background}
        onClose={() => setEditingBand(null)}
        messages={messages}
      />

      <div className="flex flex-col gap-4 @4xl/main:flex-row">
        <DesignPreviewPane
          store={store}
          categories={categories}
          bands={bands}
          year={year}
          sections={previewOf(rows, saved)}
          colors={palette}
          orderedIds={orderedIdsOf(rows)}
          onReorder={(ids) => draft.edit(applyOrder(rows, ids))}
          onEdit={setEditingComponent}
          selectedId={editingComponent}
          messages={messages}
        />

        <DesignPanel
          bands={arrangementOf(rows, saved)}
          loading={draft.loading}
          onReorder={(ids) => draft.edit(applyOrder(rows, ids))}
          onReorderComponents={(sectionId, ids) => draft.edit(applyComponentOrder(rows, sectionId, ids))}
          onToggleBand={(id, isActive) =>
            draft.edit(rows.map((row) => (row.id === id ? { ...row, isActive } : row)))
          }
          onEditBand={setEditingBand}
          onDeleteBand={(id) => setPendingDelete({ level: "band", id, name: bandName(id) })}
          onToggle={(id, isActive) => draft.patchComponent(id, { isActive })}
          onSpanChange={(id, span) => draft.patchComponent(id, { span })}
          onDelete={(id) => {
            const component = saved.flatMap((section) => section.components).find((c) => c.id === id)
            if (component) {
              setPendingDelete({ level: "component", id, name: labelOf(component.kind, component.title, messages) })
            }
          }}
          onEdit={setEditingComponent}
          // A new band around the one component. Adding is a saved write, not a draft edit —
          // holding it in the browser would mean a reload could lose what the owner watched appear.
          //
          // The form opens on the block that was just created, which is the whole of what "adicionar"
          // used to be missing: the write fired and nothing else happened, so a banner landed empty
          // at the foot of the page and the owner had to find it. The id comes back on the created
          // Section, so there is nothing to look up.
          onAdd={(kind) =>
            addSection.mutate(
              { component: { kind } },
              { onSuccess: (section) => setEditingComponent(section.components[0]?.id ?? null) },
            )
          }
          /*
            Adding INTO a band, which is the only way two blocks end up side by side.

            A run of posters is found inside one band (`runsOf`, storefront-sections.tsx), and every
            other way of adding wrapped the block in a band of its own — so "metade" and "um terço"
            were unreachable by construction, and a third-width poster alone in its row drew a third
            of width with two thirds of nothing. `useCreateComponent` had been built for exactly
            this and had no caller.
          */
          renderAddToBand={(sectionId) => (
            <BlockGallery
              taken={takenKinds}
              unavailable={unavailableKinds}
              pending={addToBand.isPending}
              triggerLabel={messages.design.addToBand}
              triggerClassName="h-8 justify-start text-xs"
              onAdd={(kind) =>
                addToBand.mutate(
                  { sectionId, payload: { kind } },
                  { onSuccess: (component) => setEditingComponent(component.id) },
                )
              }
              messages={messages}
            />
          )}
          adding={addSection.isPending}
          // The two the shop may only have one of. Every other kind is offered every time.
          // A site has no catalogue to list; a shop has no screen for a form's leads.
          unavailable={unavailableKinds}
          taken={takenKinds}
          palette={palette}
          onPalette={setPalette}
          presets={presets.data ?? []}
          paletteChanged={paletteChanged}
          savingColours={saveColors.isPending}
          onSaveColours={() => saveColors.mutate(palette)}
          messages={messages}
        />
      </div>
    </div>
  )
}
