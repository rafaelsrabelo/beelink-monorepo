"use client"

// Types
import type { StoreColorPreset, StoreColors } from "@harness-monorepo/contracts"

// UI
import { BandArrangement } from "@harness-monorepo/ui/blocks/design/band-arrangement"
import type { ArrangementBand, InsertAt, JoinAbove } from "@harness-monorepo/ui/blocks/design/band-arrangement"
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
  /** A band's header, or a lone block's swatch: the band chosen, its Estilo in the panel. */
  onEditBand: (id: string) => void
  onDeleteBand: (id: string) => void
  onToggle: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  /** A "+" was pressed — between bands, or inside one. The screen opens the gallery for that place. */
  onInsert: (at: InsertAt) => void
  /** A band's only block, moved up beside the band above's last. */
  onJoinAbove: (move: JoinAbove) => void
  inserting: boolean
  /** What an add or a move answered when it failed, in the owner's words. */
  error?: string | null
  selectedId: string | null
  /** The band chosen on its own. */
  selectedBandId: string | null
  /** Held by the screen, so the tab survives the column turning into a drawer and back. */
  tab: "blocks" | "colors"
  onTabChange: (tab: "blocks" | "colors") => void

  palette: StoreColors
  onPalette: (colors: StoreColors) => void
  presets: readonly StoreColorPreset[]
  paletteChanged: boolean
  savingColours: boolean
  onSaveColours: () => void

  messages: UiMessages
}

/**
 * The editor's structure column: what the page is made of (Seções), and what it is painted in (Tema).
 *
 * The chosen block's fields are not here any more — they have the right-hand column to themselves.
 * The screen owns the unsent edit and the writing of it, and this owns how the two tabs are drawn.
 * Every callback goes back out; nothing here reaches for a mutation.
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
  onDelete,
  onEdit,
  onInsert,
  onJoinAbove,
  inserting,
  error = null,
  selectedId,
  selectedBandId,
  tab,
  onTabChange,
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
    <Tabs value={tab} onValueChange={(next: string) => onTabChange(next === "colors" ? "colors" : "blocks")}>
      <TabsList className="w-full">
        <TabsTrigger value="blocks" className="flex-1">
          {text.frame.tabSections}
        </TabsTrigger>
        <TabsTrigger value="colors" className="flex-1">
          {text.frame.tabTheme}
        </TabsTrigger>
      </TabsList>

      {/* Kept mounted while the theme shows, so a drag's announcements are not cut off mid-sentence. */}
      <TabsContent value="blocks" keepMounted className="flex flex-col gap-3 pt-3">
        <p className="text-muted-foreground text-xs">{text.previewNotice}</p>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
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
            onDelete={onDelete}
            onEdit={onEdit}
            // A band or a block is created saved, not as part of the draft: holding a new row in the
            // browser until Publish would mean a reload could lose something the owner watched appear.
            onInsert={onInsert}
            onJoinAbove={onJoinAbove}
            inserting={inserting}
            selectedId={selectedId}
            selectedBandId={selectedBandId}
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
  )
}
