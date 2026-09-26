"use client"

// React
import { useEffect, useState } from "react"

// Types
import type { PublicComponentItem, Section, StoreComponent } from "@harness-monorepo/contracts"

// UI
import { bandLabelOf } from "@harness-monorepo/ui/blocks/design/band-label"
import { BandStyleFields } from "@harness-monorepo/ui/blocks/design/band-style-fields"
import { contentReady } from "@harness-monorepo/ui/blocks/design/component-content-fields"
import { ComponentLayoutFields, hasLayout, type ComponentLayoutValues } from "@harness-monorepo/ui/blocks/design/component-layout-fields"
import { InspectorTabs, type InspectorTab } from "@harness-monorepo/ui/blocks/design/inspector-tabs"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useUpdateComponent, useUpdateSection } from "@/services/page/page-hooks"
import { useImageUpload } from "@/services/uploads/upload-hooks"
import { useDesignEdit } from "@/stores/design-edit"
import { isStripBand, toBandForm, toBandPayload } from "./band-form-values"
import { BlockContent } from "./block-content"
import { toForm, toPayload } from "./component-form-values"
import { labelOf } from "./design-draft"
import { INSPECTOR_TITLE, InspectorHeader } from "./inspector-header"
import { pageErrorCopy } from "./page-error-copy"

import type { WebMessages } from "@/locales"

export interface ComponentEditorProps {
  slug: string
  /** The band whose Estilo this is: the block's, or the one chosen on its own. */
  section: Section
  /** Where the band sits, one-based: what an unnamed band is called by. */
  position: number
  /** The block chosen, or null while its band is chosen on its own. */
  component: StoreComponent | null
  /** The block's layout as the draft holds it. It changes the draft, not the server. */
  layout: ComponentLayoutValues | null
  onLayoutChange: (next: Partial<ComponentLayoutValues>) => void
  tab: InspectorTab
  onTabChange: (tab: InspectorTab) => void
  /** What the page is painted, so turning a band's colour on starts somewhere visible. */
  pageBackground: string
  categoriesShown: number
  /** What the public read resolved for this block — a showcase's cards, a featured product's — when it did. */
  shelf?: readonly PublicComponentItem[]
  onClose: () => void
  /** Whether the heading takes the focus on the way in: not when the editor's keys chose. */
  takeFocus?: boolean
  /** The key the editor's ↑↓ know this panel's target by. */
  nodeId?: string
  /** Told after a save lands, so the screen can take what only the server knows — a showcase's products. */
  onSaved?: (component: StoreComponent) => void
  messages: UiMessages
  /** Where a refusal's `errorCode` becomes a sentence. */
  web: WebMessages
}

/**
 * The chosen block's panel — Conteúdo, Layout and Estilo — or a band's, when it is chosen on its own.
 *
 * Mounted once per thing chosen (the inspector keys it), so choosing another starts afresh instead
 * of showing the last one's fields under the new one's name. That exact confusion was reported once.
 *
 * Two writes and two promises. What the block says and what the band looks like are saved on Salvar,
 * straight to the API: the owner wants to see those land. How the block sits is the draft's, with
 * the order and the visibility, until Publicar — the Layout tab never reaches Salvar at all.
 */
export function ComponentEditor({
  slug,
  section,
  position,
  component,
  layout,
  onLayoutChange,
  tab,
  onTabChange,
  pageBackground,
  categoriesShown,
  shelf,
  onClose,
  takeFocus = true,
  nodeId,
  onSaved,
  messages,
  web,
}: ComponentEditorProps) {
  const text = messages.design
  const [initial] = useState(() => (component ? toForm(component) : null))
  const [bandInitial] = useState(() => toBandForm(section))
  // A kind's single item — the strip's link — keeps its id across saves, so a re-pointed strip is the
  // same link moved. Minted once: the preview draws the fields through `toPayload` on every change,
  // and a fresh id each time would be a different item each time.
  const [itemId] = useState(() => (component?.items[0] as { id?: string } | undefined)?.id ?? crypto.randomUUID())

  // What is typed lives in `useDesignEdit`, where the preview reads it before Salvar.
  const open = useDesignEdit((state) => state.open)
  const changeComponent = useDesignEdit((state) => state.changeComponent)
  const changeBand = useDesignEdit((state) => state.changeBand)
  const close = useDesignEdit((state) => state.close)
  const componentId = component?.id ?? null
  const mine = useDesignEdit((state) =>
    state.edit?.sectionId === section.id && (state.edit.component?.id ?? null) === componentId ? state.edit : null,
  )
  useEffect(
    () =>
      open({
        sectionId: section.id,
        band: bandInitial,
        bandOpened: bandInitial,
        component: componentId && initial ? { id: componentId, value: initial, itemId } : null,
      }),
    [open, section.id, bandInitial, componentId, initial, itemId],
  )
  const value = mine?.component?.value ?? initial
  const band = mine?.band ?? bandInitial
  const bandOpened = mine?.bandOpened ?? bandInitial

  // Saved, cancelled or closed: the preview goes back to what is saved, and these fields with it.
  const done = () => {
    close()
    onClose()
  }
  // A save that lands after the owner moved on closes nothing: the panel open now is another's.
  const stillOpen = () => {
    const open = useDesignEdit.getState().edit
    return open?.sectionId === section.id && (open.component?.id ?? null) === componentId
  }

  const update = useUpdateComponent(slug)
  const updateBand = useUpdateSection(slug)
  const image = useImageUpload()
  // The block is written only when Conteúdo changed it. A lone block is edited as its band, and one
  // the API would refuse as it stands — a showcase whose category was deleted — must not hold its
  // band's colour hostage.
  const contentChanged =
    !!value && !!initial && JSON.stringify(toPayload(value, itemId)) !== JSON.stringify(toPayload(initial, itemId))
  const ready = value && contentChanged ? contentReady(value) : true

  /*
    The block first, then the band, and only what changed: a save that only changed the words touches
    one row, not two. Awaited here and not chained through `mutate`'s callbacks, which stop firing
    once the panel unmounts — a close or another block chosen mid-save would drop the band's write.
    A write that fails keeps the panel open with its reason; its mutation holds the error.
  */
  const save = async () => {
    const bandPayload = toBandPayload(band, bandOpened)
    try {
      if (component && value && contentChanged) {
        onSaved?.(await update.mutateAsync({ componentId: component.id, payload: toPayload(value, itemId) }))
      }
      if (Object.keys(bandPayload).length) await updateBand.mutateAsync({ sectionId: section.id, payload: bandPayload })
      if (stillOpen()) done()
    } catch {
      // Shown by the panel from the mutation's own error.
    }
  }

  const name = component ? labelOf(component.kind, component.title, messages) : bandLabelOf(band.name, position, messages)
  const error = update.error ?? updateBand.error

  return (
    <section
      aria-labelledby={INSPECTOR_TITLE}
      aria-describedby={`${INSPECTOR_TITLE}-block`}
      className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-3"
    >
      <InspectorHeader
        title={component ? text.editComponent : text.inspector.editBand}
        name={name}
        onClose={done}
        takeFocus={takeFocus}
        {...(nodeId ? { nodeId } : {})}
        messages={messages}
      />

      <InspectorTabs
        tab={tab}
        onTabChange={onTabChange}
        name={name}
        {...(component && value
          ? {
              content: (
                <BlockContent
                  slug={slug}
                  component={component}
                  value={value}
                  onChange={(next) => changeComponent(component.id, next)}
                  display={layout?.display ?? null}
                  image={image}
                  categoriesShown={categoriesShown}
                  {...(shelf ? { shelf } : {})}
                  messages={messages}
                />
              ),
            }
          : {})}
        {...(component && layout && hasLayout(component.kind)
          ? {
              layout: (
                <ComponentLayoutFields
                  kind={component.kind}
                  value={layout}
                  onChange={onLayoutChange}
                  bandWidth={band.width}
                  messages={messages}
                />
              ),
            }
          : {})}
        style={
          <BandStyleFields
            value={band}
            onChange={(next) => changeBand(section.id, next)}
            strip={isStripBand(section)}
            sharedWith={section.components.length}
            pageBackground={pageBackground}
            messages={messages}
          />
        }
        onSubmit={() => void save()}
        onCancel={done}
        pending={update.isPending || updateBand.isPending}
        // Salvar waits for a picture on its way: saved now, the slide would go without it.
        submitDisabled={image.pending || !ready}
        attention={ready ? null : "content"}
        messages={messages}
      />

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {pageErrorCopy(error, web)}
        </p>
      ) : null}
    </section>
  )
}
