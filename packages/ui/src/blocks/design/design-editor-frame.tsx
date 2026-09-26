"use client"

// React
import { useEffect, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react"

// UI
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@harness-monorepo/ui/components/sheet"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { PreviewDevice } from "./preview-device-toggle"

/** Where the three columns fit side by side: the structure's 360 px, the panel's 340 px and the preview. */
const WIDE = "(min-width: 64rem)"

/** Where the bar has room for Celular | Computador — its `sm:` (`design-editor-bar.tsx`). */
const ROOMY = "(min-width: 40rem)"

/** Built once per query: `useSyncExternalStore` resubscribes whenever it is handed a new function. */
function watch(media: string): (onChange: () => void) => () => void {
  return (onChange) => {
    const query = window.matchMedia(media)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }
}

const subscribeWide = watch(WIDE)
const subscribeRoomy = watch(ROOMY)

/**
 * Whether the columns fit. The server renders the wide frame; a narrow browser switches to drawers
 * right after hydration, which `useSyncExternalStore` does without a mismatch.
 */
export function useWideEditor(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => true,
  )
}

/**
 * The width the preview draws the shop at, and the owner's way to change it.
 *
 * The computer first, the owner's call: a phone preview stacks every row of blocks side by side. The
 * pick lasts while the editor is open. Where the bar has no room for the toggle the preview is the
 * phone's whatever was picked — a 1440 px shop in a phone's pane paints at a quarter scale, with no
 * control to leave it — and the pick comes back when the window widens again.
 */
export function usePreviewDevice(): [PreviewDevice, (device: PreviewDevice) => void] {
  const [picked, setPicked] = useState<PreviewDevice>("DESKTOP")
  const roomy = useRoomyEditor()
  return [roomy ? picked : "PHONE", setPicked]
}

/** Whether the editor has more than a phone's width: room for two things side by side. */
export function useRoomyEditor(): boolean {
  return useSyncExternalStore(
    subscribeRoomy,
    () => window.matchMedia(ROOMY).matches,
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
  /** The panel in the drawer draws its own close button, so the drawer does not add a second. */
  inspectorHasOwnClose?: boolean
  /** The editor's keys, heard once for the whole screen; the handler decides what they reach. */
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
  /** What the editor just did, said to a screen reader: a move, a choice by the keys. */
  status?: string
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
  inspectorHasOwnClose = false,
  onKeyDown,
  status = "",
  messages = defaultMessages,
}: DesignEditorFrameProps) {
  const text = messages.design.frame
  const wide = useWideEditor()

  // Widened with a drawer open, the drawer has nothing to be: its panel is a column now. Left open,
  // it would pop back up, modal, the moment the window narrowed again.
  useEffect(() => {
    if (!wide) return
    onStructureOpenChange(false)
    onInspectorOpenChange(false)
  }, [wide, onStructureOpenChange, onInspectorOpenChange])

  return (
    <div className="bg-shell flex h-dvh flex-col" onKeyDown={onKeyDown}>
      {/* `aria-live` spelled out: a modal drawer hides everything outside it but what carries it. */}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {status}
      </p>
      {bar}
      <div className="flex min-h-0 flex-1">
        {wide ? (
          <aside
            data-design-region=""
            aria-label={text.structureLabel}
            // Hidden by CSS too: the server renders the wide frame, and a phone must not flash it.
            className="bg-shell-surface border-shell-border hidden w-90 shrink-0 overflow-y-auto border-r p-3 lg:block"
          >
            {structure}
          </aside>
        ) : null}

        <main data-design-region="" aria-label={text.previewLabel} className="min-w-0 flex-1 overflow-y-auto p-4 lg:px-6">
          {preview}
        </main>

        {wide ? (
          <aside
            data-design-region=""
            aria-label={text.inspectorLabel}
            className="bg-shell-surface border-shell-border hidden w-85 shrink-0 overflow-y-auto border-l p-3 lg:block"
          >
            {inspector}
          </aside>
        ) : null}
      </div>

      {wide ? null : (
        <>
          <Sheet open={structureOpen} onOpenChange={onStructureOpenChange}>
            <SheetContent
              data-design-region=""
              side="left"
              closeLabel={text.close}
              className="overflow-y-auto p-3 data-[side=left]:w-[min(22.5rem,92vw)] data-[side=left]:sm:max-w-none"
            >
              <SheetHeader className="p-0">
                <SheetTitle>{text.structure}</SheetTitle>
                <SheetDescription className="sr-only">{text.structureLabel}</SheetDescription>
              </SheetHeader>
              {structure}
            </SheetContent>
          </Sheet>
          <Sheet open={inspectorOpen} onOpenChange={onInspectorOpenChange}>
            {/* Kept mounted while closed: the fields being typed in live here, unsaved. */}
            <SheetContent
              data-design-region=""
              side="right"
              keepMounted
              showCloseButton={!inspectorHasOwnClose}
              closeLabel={text.close}
              className="overflow-y-auto p-3 data-[side=right]:w-[min(21.25rem,92vw)] data-[side=right]:sm:max-w-none"
            >
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
