"use client"

// React
import { useSyncExternalStore, type ReactNode } from "react"

// UI
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@harness-monorepo/ui/components/sheet"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** Where the three columns fit side by side: the structure's 360 px, the panel's 340 px and a phone preview. */
const WIDE = "(min-width: 64rem)"

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(WIDE)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/**
 * Whether the columns fit. The server renders the wide frame; a narrow browser switches to drawers
 * right after hydration, which `useSyncExternalStore` does without a mismatch.
 */
export function useWideEditor(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => true,
  )
}

export interface DesignEditorFrameProps {
  bar: ReactNode
  /** What the page is made of — the left column, or a drawer from the left. */
  structure: ReactNode
  preview: ReactNode
  /** The chosen block's fields — the right column, or a drawer from the right. */
  inspector: ReactNode
  structureOpen: boolean
  onStructureOpenChange: (open: boolean) => void
  inspectorOpen: boolean
  onInspectorOpenChange: (open: boolean) => void
  messages?: UiMessages
}

/**
 * The design editor's whole screen: the bar above, and structure | preview | panel below.
 *
 * Each side column is drawn once — as a column where the three fit, as a drawer where they do not —
 * and never both. A form being typed in lives in the panel, and two copies of it would be two
 * states for one block.
 */
export function DesignEditorFrame({
  bar,
  structure,
  preview,
  inspector,
  structureOpen,
  onStructureOpenChange,
  inspectorOpen,
  onInspectorOpenChange,
  messages = defaultMessages,
}: DesignEditorFrameProps) {
  const text = messages.design.frame
  const wide = useWideEditor()

  return (
    <div className="bg-shell flex h-dvh flex-col">
      {bar}
      <div className="flex min-h-0 flex-1">
        {wide ? (
          <aside
            aria-label={text.structureLabel}
            className="bg-shell-surface border-shell-border w-90 shrink-0 overflow-y-auto border-r p-3"
          >
            {structure}
          </aside>
        ) : null}

        <main aria-label={text.previewLabel} className="min-w-0 flex-1 overflow-y-auto p-4 lg:px-6">
          {preview}
        </main>

        {wide ? (
          <aside
            aria-label={text.inspectorLabel}
            className="bg-shell-surface border-shell-border w-85 shrink-0 overflow-y-auto border-l p-3"
          >
            {inspector}
          </aside>
        ) : null}
      </div>

      {wide ? null : (
        <>
          <Sheet open={structureOpen} onOpenChange={onStructureOpenChange}>
            <SheetContent side="left" className="w-90 max-w-[90vw] overflow-y-auto p-3">
              <SheetHeader className="p-0">
                <SheetTitle>{text.structure}</SheetTitle>
                <SheetDescription className="sr-only">{text.structureLabel}</SheetDescription>
              </SheetHeader>
              {structure}
            </SheetContent>
          </Sheet>
          <Sheet open={inspectorOpen} onOpenChange={onInspectorOpenChange}>
            <SheetContent side="right" className="w-85 max-w-[90vw] overflow-y-auto p-3">
              <SheetHeader className="p-0">
                <SheetTitle>{text.inspector}</SheetTitle>
                <SheetDescription className="sr-only">{text.inspectorLabel}</SheetDescription>
              </SheetHeader>
              {inspector}
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  )
}
