"use client"

// Types
import type { SectionKind, StoreColorPreset, StoreColors } from "@harness-monorepo/contracts"

// UI
import { AddBlockMenu } from "@harness-monorepo/ui/blocks/design/add-block-menu"
import { DesignColors } from "@harness-monorepo/ui/blocks/design/design-colors"
import { SectionArrangement } from "@harness-monorepo/ui/blocks/design/section-arrangement"
import type { ArrangementLayout } from "@harness-monorepo/ui/blocks/design/section-arrangement"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@harness-monorepo/ui/components/tabs"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { Draft } from "./design-draft"

export interface DesignPanelProps {
  rows: readonly Draft[]
  loading: boolean
  onReorder: (ids: string[]) => void
  onToggle: (id: string, isActive: boolean) => void
  onLayoutChange: (id: string, layout: ArrangementLayout) => void
  onDelete: (id: string) => void
  onAdd: (kind: SectionKind) => void
  adding: boolean

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
  rows,
  loading,
  onReorder,
  onToggle,
  onLayoutChange,
  onDelete,
  onAdd,
  adding,
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
            A block is created saved, not as part of the draft. Adding one is not an arrangement —
            it is a new row, and holding it in the browser until Publish would mean a reload could
            lose a block the owner watched appear.
          */}
          <AddBlockMenu
            taken={rows.map((row) => row.kind)}
            pending={adding}
            onAdd={onAdd}
            messages={messages}
          />
          <p className="text-muted-foreground text-xs">{text.previewNotice}</p>
          {loading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : (
            <SectionArrangement
              items={rows}
              onReorder={onReorder}
              onToggle={onToggle}
              onLayoutChange={onLayoutChange}
              onDelete={onDelete}
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
