"use client"

// React
import { useState } from "react"

// Libs
import { PlusIcon, SearchIcon } from "lucide-react"

// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { Input } from "@harness-monorepo/ui/components/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@harness-monorepo/ui/components/sheet"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BlockThumbnail } from "./block-thumbnail"
import { BLOCK_GROUPS, COMPONENT_KINDS, GROUP_OF_KIND } from "./design-types"
import type { ComponentKind } from "./design-types"

/**
 * The gallery a shopkeeper adds a block from.
 *
 * It replaced a 240px dropdown of names, and the reason is what the owner said about the editor:
 * you could not tell what you were adding. A name alone does not say that "Produtos" comes out as a
 * grid of three, so the only way to find out was to add it, look, and delete it again.
 *
 * So every entry carries its own wireframe and one line of what it is, the entries are filed under
 * four short headings instead of one long list, and a search box is there for the shopkeeper who
 * already knows the word. A panel and not a dropdown because a dropdown that wide, that tall and
 * with a text field in it is a panel that has not admitted it: focus, Escape and the close button
 * all come from `Sheet` for free.
 *
 * The kinds themselves are unchanged — this is how they are offered, not what exists.
 */
export interface BlockGalleryProps {
  /** The kinds the shop already has one of, so a singleton is offered once. */
  taken?: readonly ComponentKind[]
  /**
   * The kinds this kind of page cannot hold at all: a site has no products to list, and a shop's
   * form would gather leads it has no screen to show. Apart from `taken`, which is about how many.
   */
  unavailable?: readonly ComponentKind[]
  onAdd: (kind: ComponentKind) => void
  pending?: boolean
  /**
   * The words on the trigger. The gallery is opened from two places that mean different things:
   * the top of the panel, which adds a band, and a band's own foot, which adds INTO that band —
   * and only the second puts two blocks side by side, because blocks share a row only inside one
   * band's grid (`StorefrontBandGrid`).
   */
  triggerLabel?: string
  triggerClassName?: string
  /**
   * Starts the panel open. It exists for the story: rule 2 of this package's contract makes the
   * story the a11y panel, and a story that draws only a closed button is a panel nobody checked.
   */
  defaultOpen?: boolean
  messages?: UiMessages
}

export function BlockGallery({
  taken = [],
  unavailable = [],
  onAdd,
  pending = false,
  defaultOpen = false,
  triggerLabel,
  triggerClassName,
  messages = defaultMessages,
}: BlockGalleryProps) {
  const text = messages.design
  const gallery = text.gallery
  const [open, setOpen] = useState(defaultOpen)
  const [query, setQuery] = useState("")

  const offered = COMPONENT_KINDS.filter(
    (kind) => !taken.includes(kind) && !unavailable.includes(kind),
  )

  if (!offered.length) return null

  // Name and hint both, because the shopkeeper who searches "carrossel" is looking for the banner
  // and the word is only in the hint. Accent-insensitive is deliberately not attempted here: the
  // copy is pt-BR and folding it would need the locale's collator for one field of one panel.
  const needle = query.trim().toLocaleLowerCase()
  const matches = offered.filter((kind) =>
    needle === ""
      ? true
      : `${text.kinds[kind]} ${gallery.hints[kind]}`.toLocaleLowerCase().includes(needle),
  )

  const add = (kind: ComponentKind) => {
    onAdd(kind)
    setOpen(false)
    setQuery("")
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* The trigger is the button itself: this primitive takes no `asChild`, which is how
          `admin-store-menu.tsx` drives its own trigger too. */}
      <SheetTrigger
        disabled={pending}
        className={cn(buttonVariants({ variant: "outline" }), "w-full", triggerClassName)}
      >
        <PlusIcon aria-hidden="true" className="size-4" />
        {triggerLabel ?? text.addBlock}
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{gallery.title}</SheetTitle>
          <SheetDescription>{gallery.description}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-4">
          <div className="relative">
            <SearchIcon
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              type="search"
              aria-label={gallery.searchLabel}
              placeholder={gallery.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
            />
          </div>

          {matches.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">{gallery.empty}</p>
          ) : (
            BLOCK_GROUPS.map((group) => {
              const inGroup = matches.filter((kind) => GROUP_OF_KIND[kind] === group)
              // Not drawn when empty: a heading over nothing is what filing by page type would
              // have produced for every site, for every shop.
              if (!inGroup.length) return null

              return (
                <section key={group} className="flex flex-col gap-2">
                  <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {gallery.groups[group]}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {inGroup.map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        disabled={pending}
                        onClick={() => add(kind)}
                        className="hover:border-primary hover:bg-accent focus-visible:border-ring focus-visible:ring-ring/50 flex cursor-pointer flex-col gap-2 rounded-lg border p-2 text-left transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <BlockThumbnail kind={kind} />
                        <span className="text-sm font-semibold">{text.kinds[kind]}</span>
                        <span className="text-muted-foreground text-xs">{gallery.hints[kind]}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
