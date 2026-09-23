"use client"

// Types
import type { ComponentKind, StoreColorPreset, StoreColors } from "@harness-monorepo/contracts"

// UI
import { AddBlockMenu } from "@harness-monorepo/ui/blocks/design/add-block-menu"
import { BandArrangement } from "@harness-monorepo/ui/blocks/design/band-arrangement"
import type { ArrangementBand, ArrangementLayout } from "@harness-monorepo/ui/blocks/design/band-arrangement"
import { DesignColors } from "@harness-monorepo/ui/blocks/design/design-colors"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@harness-monorepo/ui/components/tabs"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface DesignPanelProps {
  bands: readonly ArrangementBand[]
  loading: boolean
  onReorder: (ids: string[]) => void
  onReorderComponents: (sectionId: string, ids: string[]) => void
  onToggleBand: (id: string, isActive: boolean) => void
  onEditBand: (id: string) => void
  onDeleteBand: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  onLayoutChange: (id: string, layout: ArrangementLayout) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  /** Adds a band built around one component — the only way a band is created. */
  onAdd: (kind: ComponentKind) => void
  adding: boolean
  /** The kinds the shop already has one of, so a singleton is offered once. */
  taken: readonly ComponentKind[]
  /** The kinds this kind of page cannot hold at all. */
  unavailable: readonly ComponentKind[]

  palette: StoreColors
  onPalette: (colors: StoreColors) => void
  presets: readonly StoreColorPreset[]
  paletteChanged: boolean
  savingColours: boolean
  onSaveColours: () => void

  messages: UiMessages
}

/**
 * Everything beside the preview: what the page is made of, and what it is painted in.
 *
 * Its own file because the screen it came out of had grown past the line limit, and because the
 * split falls where the responsibility does — the screen owns the unsent edit and the writing of
 * it, and this owns how the two tabs are drawn. Every callback goes back out; nothing here reaches
 * for a mutation.
 */
export function DesignPanel({
  bands,
  loading,
  onReorder,
  onReorderComponents,
  onToggleBand,
  onEditBand,
  onDeleteBand,
  onToggle,
  onLayoutChange,
  onDelete,
  onEdit,
  onAdd,
  adding,
  taken,
  unavailable,
  palette,
  onPalette,
  presets,
  paletteChanged,
  savingColours,
  onSaveColours,
  messages,
}: DesignPanelProps) {
  const text = messages.design

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 @4xl/main:w-96">
      <Tabs defaultValue="blocks">
        <TabsList className="w-full">
          <TabsTrigger value="blocks" className="flex-1">
            {text.tabBlocks}
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex-1">
            {text.tabColors}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blocks" className="flex flex-col gap-3 pt-3">
          {/*
            A band is created saved, not as part of the draft. Adding one is not an arrangement —
            it is a new row, and holding it in the browser until Publish would mean a reload could
            lose something the owner watched appear.
          */}
          {/*
            Held while the list loads, or the menu would offer the shop's singletons — the product
            list among them — before it knows the shop already has them.
          */}
          <AddBlockMenu taken={taken} unavailable={unavailable} pending={adding || loading} onAdd={onAdd} messages={messages} />
          <p className="text-muted-foreground text-xs">{text.previewNotice}</p>
          {loading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : (
            <BandArrangement
              bands={bands}
              onReorder={onReorder}
              onReorderComponents={onReorderComponents}
              onToggleBand={onToggleBand}
              onEditBand={onEditBand}
              onDeleteBand={onDeleteBand}
              onToggle={onToggle}
              onLayoutChange={onLayoutChange}
              onDelete={onDelete}
              onEdit={onEdit}
              messages={messages}
            />
          )}
        </TabsContent>

        <TabsContent value="colors" className="pt-3">
          <DesignColors
            value={palette}
            onChange={onPalette}
            presets={presets}
            dirty={paletteChanged}
            pending={savingColours}
            onSave={onSaveColours}
            messages={messages}
          />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
