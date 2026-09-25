"use client"

// React
import { useEffect, useState } from "react"

// Types
import type { Section, StoreComponent } from "@harness-monorepo/contracts"

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
import { bandChanged, isStripBand, toBandForm, toBandPayload } from "./band-form-values"
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
  shelfEmpty: boolean
  onClose: () => void
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
  shelfEmpty,
  onClose,
  onSaved,
  messages,
  web,
}: ComponentEditorProps) {
  const text = messages.design
  const [initial] = useState(() => (component ? toForm(component) : null))
  const [bandInitial] = useState(() => toBandForm(section))
  // The strip's link keeps its id across saves, so a re-pointed strip is the same link moved. Minted
  // once: the preview draws the fields through `toPayload` on every change, and a fresh id each time
  // would be a different link each time.
  const [linkId] = useState(() => (component?.items[0] as { id?: string } | undefined)?.id ?? crypto.randomUUID())

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
        component: componentId && initial ? { id: componentId, value: initial, linkId } : null,
      }),
    [open, section.id, bandInitial, componentId, initial, linkId],
  )
  const value = mine?.component?.value ?? initial
  const band = mine?.band ?? bandInitial
  const bandOpened = mine?.bandOpened ?? bandInitial

  // Saved, cancelled or closed: the preview goes back to what is saved, and these fields with it.
  const done = () => {
    close()
    onClose()
  }

  const update = useUpdateComponent(slug)
  const updateBand = useUpdateSection(slug)
  const image = useImageUpload()
  const ready = value ? contentReady(value) : true

  // The band second, and only when Estilo changed it: a save that only changed the words touches one
  // row, not two. A band that fails keeps the panel open with its reason; the block is saved already.
  const saveBand = () =>
    bandChanged(band, bandOpened)
      ? updateBand.mutate({ sectionId: section.id, payload: toBandPayload(band, bandOpened) }, { onSuccess: done })
      : done()
  const save = () => {
    if (!component || !value) return saveBand()
    update.mutate(
      { componentId: component.id, payload: toPayload(value, linkId) },
      {
        onSuccess: (saved) => {
          onSaved?.(saved)
          saveBand()
        },
      },
    )
  }

  const name = component ? labelOf(component.kind, component.title, messages) : bandLabelOf(band.name, position, messages)
  const error = update.error ?? updateBand.error

  return (
    <section
      aria-labelledby={INSPECTOR_TITLE}
      aria-describedby={`${INSPECTOR_TITLE}-block`}
      className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-3"
    >
      <InspectorHeader title={component ? text.editComponent : text.inspector.editBand} name={name} onClose={done} messages={messages} />

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
                  shelfEmpty={shelfEmpty}
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
        onSubmit={save}
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
