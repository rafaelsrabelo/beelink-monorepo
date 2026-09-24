"use client"

// React
import { useState, type ReactNode } from "react"

// Types
import type { StoreColorPreset, StoreColors } from "@harness-monorepo/contracts"

// UI
import { BandArrangement } from "@harness-monorepo/ui/blocks/design/band-arrangement"
import type { ArrangementBand, ArrangementSpan, InsertAt } from "@harness-monorepo/ui/blocks/design/band-arrangement"
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
  onSpanChange: (id: string, span: ArrangementSpan) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  /** A "+" was pressed — between bands, or inside one. The screen opens the gallery for that place. */
  onInsert: (at: InsertAt) => void
  inserting: boolean
  /** The selected block's fields, drawn above the list; null while none is selected. */
  inspector: ReactNode
  selectedId: string | null

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
  onSpanChange,
  onDelete,
  onEdit,
  onInsert,
  inserting,
  inspector,
  selectedId,
  palette,
  onPalette,
  presets,
  paletteChanged,
  savingColours,
  onSaveColours,
  messages,
}: DesignPanelProps) {
  const text = messages.design
  const [tab, setTab] = useState<"blocks" | "colors">("blocks")
  // A block chosen in the preview while the colours are showing brings its fields into view: adjusted
  // during render, when the selection changes, rather than in an effect a frame later.
  const [shownFor, setShownFor] = useState(selectedId)
  if (selectedId !== shownFor) {
    setShownFor(selectedId)
    if (selectedId) setTab("blocks")
  }

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 @4xl/main:w-96">
      <Tabs value={tab} onValueChange={(next: string) => setTab(next === "colors" ? "colors" : "blocks")}>
        <TabsList className="w-full">
          <TabsTrigger value="blocks" className="flex-1">
            {text.tabBlocks}
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex-1">
            {text.tabColors}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blocks" className="flex flex-col gap-3 pt-3">
          {inspector}
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
              onSpanChange={onSpanChange}
              onDelete={onDelete}
              onEdit={onEdit}
              // A band or a block is created saved, not as part of the draft: holding a new row in the
              // browser until Publish would mean a reload could lose something the owner watched appear.
              onInsert={onInsert}
              inserting={inserting}
              selectedId={selectedId}
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
