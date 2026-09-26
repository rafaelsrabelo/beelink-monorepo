"use client"

// React
import { useState, type ReactNode } from "react"

// Libs
import { SearchIcon } from "lucide-react"

// UI
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@harness-monorepo/ui/components/dialog"
import { Input } from "@harness-monorepo/ui/components/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@harness-monorepo/ui/components/tabs"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { useRoomyEditor } from "./design-editor-frame"
import { COMPONENT_KINDS, type Across, type ComponentKind } from "./design-types"
import { SectionGalleryCard } from "./section-gallery-card"
import { entriesOf, matchesOf, shelvesOf, type GalleryEntry, type GalleryShelf } from "./section-gallery-entries"

// What `onAdd` hands back, for the screen: `design-types.ts` is not among this package's exports.
export type { Across, GalleryEntry }

export interface SectionGalleryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The kinds the shop already has one of, so a singleton is offered once. */
  taken?: readonly ComponentKind[]
  /** The kinds this kind of page cannot hold at all: a site sells nothing, a shop gathers no leads. */
  unavailable?: readonly ComponentKind[]
  /** `across` is 1 for every card but a row of banners. */
  onAdd: (kind: ComponentKind, across: Across) => void
  /** Offers the rows of two and three, where a band is created: a row is a band. */
  offerRows?: boolean
  /** Where the section goes, said under the title — "Entra entre Capa e Produtos." — by the screen that knows the page. */
  placement?: string
  /**
   * The section as the shop would draw it, for its card. Only the open shelf's cards ask, so a
   * shop's products are drawn for the shelf being looked at and not for all seven.
   */
  renderPreview?: (entry: GalleryEntry) => ReactNode
  pending?: boolean
  messages?: UiMessages
}

/**
 * The gallery every "+" opens: the shelves on the left, a search, and the sections on offer, each
 * shown before it is added and added with its own button.
 *
 * A dialog and not the drawer it replaced: the owner chooses by looking, and a 28rem drawer showed a
 * wireframe the size of a stamp. The shelves are tabs — the arrows walk them — standing in a column
 * where there is room and in a row on a phone. A search looks across every shelf at once.
 */
export function SectionGallery({
  open,
  onOpenChange,
  taken = [],
  unavailable = [],
  onAdd,
  offerRows = false,
  placement,
  renderPreview,
  pending = false,
  messages = defaultMessages,
}: SectionGalleryProps) {
  const text = messages.design.gallery
  const roomy = useRoomyEditor()
  const [query, setQuery] = useState("")
  const [picked, setPicked] = useState<GalleryShelf>("RECOMMENDED")

  const offered = COMPONENT_KINDS.filter((kind) => !taken.includes(kind) && !unavailable.includes(kind))
  const entries = entriesOf(offered, offerRows, messages)
  const shelves = shelvesOf(entries)
  const shelf = shelves.some((candidate) => candidate.shelf === picked) ? picked : (shelves[0]?.shelf ?? "RECOMMENDED")
  const searching = query.trim() !== ""

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) setQuery("")
  }
  const add = (entry: GalleryEntry) => {
    onAdd(entry.kind, entry.across)
    close(false)
  }
  const grid = (cards: readonly GalleryEntry[]) =>
    cards.length === 0 ? (
      <p className="text-muted-foreground py-10 text-center text-sm">{text.empty}</p>
    ) : (
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((entry) => (
          <SectionGalleryCard
            key={`${entry.kind}-${entry.across}`}
            entry={entry}
            {...(renderPreview ? { preview: renderPreview(entry) } : {})}
            onAdd={() => add(entry)}
            pending={pending}
            messages={messages}
          />
        ))}
      </ul>
    )

  return (
    <Dialog open={open && shelves.length > 0} onOpenChange={close}>
      <DialogContent
        closeLabel={messages.design.frame.close}
        className="flex h-[min(44rem,92dvh)] w-[min(64rem,96vw)] max-w-none flex-col gap-0 p-0 sm:max-w-none"
      >
        <DialogHeader className="border-b p-4">
          <DialogTitle>{text.title}</DialogTitle>
          <DialogDescription>{placement ?? text.description}</DialogDescription>
        </DialogHeader>

        <Tabs
          orientation={roomy ? "vertical" : "horizontal"}
          value={shelf}
          onValueChange={(next: GalleryShelf) => {
            setPicked(next)
            setQuery("")
          }}
          className="flex min-h-0 flex-1 flex-col gap-0 sm:flex-row"
        >
          <div className="flex shrink-0 flex-col gap-3 border-b p-3 sm:w-56 sm:border-r sm:border-b-0">
            <div className="relative">
              <SearchIcon aria-hidden="true" className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                type="search"
                aria-label={text.searchLabel}
                placeholder={text.searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <TabsList
              aria-label={text.categoriesLabel}
              className="h-auto w-full justify-start overflow-x-auto bg-transparent p-0 sm:flex-col sm:items-stretch sm:overflow-visible"
            >
              {shelves.map(({ shelf: value, entries: inShelf }) => (
                <TabsTrigger key={value} value={value} className="shrink-0 justify-between gap-2 px-3 sm:w-full">
                  {text.categories[value]}
                  <span className="text-muted-foreground text-xs tabular-nums">{inShelf.length}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {searching ? (
              <section aria-label={text.results} className="flex flex-col gap-3">
                <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{text.results}</h3>
                {grid(matchesOf(entries, query))}
              </section>
            ) : (
              // Only the open shelf is drawn: its previews are what the owner is looking at.
              shelves.map(({ shelf: value, entries: inShelf }) => (
                <TabsContent key={value} value={value}>
                  {value === shelf ? grid(inShelf) : null}
                </TabsContent>
              ))
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
