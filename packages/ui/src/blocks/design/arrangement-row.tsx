"use client"

// Libs
import {
  BadgeCheckIcon,
  Columns3Icon,
  Columns2Icon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  HeadingIcon,
  ImageIcon,
  LayoutGridIcon,
  MailIcon,
  MegaphoneIcon,
  RectangleHorizontalIcon,
  TagsIcon,
  Trash2Icon,
  TypeIcon,
} from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { useArrangeItem } from "./design-arrange"
import type { ComponentKind } from "./design-types"

export type ArrangementLayout = "FULL" | "HALVES" | "THIRDS"

export interface ArrangementItem {
  id: string
  kind: ComponentKind
  /** Null on a component the shopkeeper has not titled. The row falls back to the kind's name. */
  title: string | null
  /** A banner's first picture, where it has one. Every other kind draws its glyph instead. */
  imageUrl?: string | null
  /**
   * How many pictures a banner holds. Absent on every other kind, where it means nothing.
   *
   * The row asks because "full, half or a third" is a question about a poster, and a poster is a
   * banner with exactly one picture — `isPoster` in the renderer says so. From the second picture
   * the banner is a carousel and runs the width of the band whatever this says, so the control was
   * still offered, still marked the page unpublished, and still changed nothing on it.
   */
  slides?: number
  layout: ArrangementLayout
  isActive: boolean
  /**
   * Whether the row draws a bin. Absent means yes.
   *
   * Decided by the screen and not by the kind, because the answer is a count the screen has and
   * this block does not: the shop's last product list cannot go, but a duplicate can. A rule keyed
   * on the kind alone was what left a shop with two shelves and no bin on either.
   */
  deletable?: boolean
  /**
   * The block has nothing to draw, so the shop window draws nothing at all for it.
   *
   * Said out loud because a silent one is what made a landing page and its editor disagree: the
   * panel listed a heading with no words and a hero with no pictures, the preview showed neither,
   * and nothing on the screen explained the difference. An empty block is not broken — it is one
   * the shopkeeper has not finished — and the row is where that gets said.
   */
  empty?: boolean
}

/**
 * How wide is a question about a poster, and only about a poster.
 *
 * A cover is as wide as the shopkeeper's `width` says and a heading is as wide as the page; asking
 * "full, half or a third" of either would be offering a choice that changes nothing. A carousel is the same case arrived at
 * differently: the renderer stops honouring the width at the second picture, so from there the
 * control changes nothing and goes, giving its 7rem back to the name — which is what had been
 * truncating a banner to "B..." in a 380px panel.
 */
function hasLayout(item: Pick<ArrangementItem, "kind" | "slides">): boolean {
  // Hidden only where it is PROVABLY dead — two pictures or more, which the renderer draws as a
  // carousel across the whole band. A banner with no picture yet is the commonest case there is:
  // the owner has just added it and is about to say how wide it goes, and taking the control away
  // while they build was worse than the dead control it replaced.
  return item.kind === "BANNER" && (item.slides ?? 0) <= 1
}

/**
 * The picture a row shows beside the title, or the glyph that stands in for one.
 *
 * Six of the eight kinds have no picture, and a blank grey rectangle beside each of them makes a
 * list of components read as a list of broken images.
 */
const KIND_ICON: Record<ComponentKind, typeof LayoutGridIcon> = {
  ANNOUNCEMENT: MegaphoneIcon,
  BANNER: ImageIcon,
  HEADING: HeadingIcon,
  TEXT: TypeIcon,
  BENEFITS: BadgeCheckIcon,
  CATEGORIES: TagsIcon,
  PRODUCTS: LayoutGridIcon,
  CONTACT: MailIcon,
}

export function ArrangementRow({
  item,
  onToggle,
  onLayoutChange,
  onDelete,
  onEdit,
  messages,
}: {
  item: ArrangementItem
  onToggle: (id: string, isActive: boolean) => void
  onLayoutChange: (id: string, layout: ArrangementLayout) => void
  /** Absent where a kind cannot be deleted; the row then draws no bin at all. */
  onDelete?: (id: string) => void
  /** Absent where a kind has nothing to write; the row is then not a button. */
  onEdit?: (id: string) => void
  messages: UiMessages
}) {
  const text = messages.design
  const drag = useArrangeItem(item.id)

  // A block the shopkeeper titled is called by that title; one they have not is called by its
  // kind. "Sem título" on four rows tells them which blocks are unfinished and nothing about
  // which is which.
  const name = item.title?.trim() || text.kinds[item.kind]
  const KindIcon = KIND_ICON[item.kind]

  return (
    <li
      ref={drag.setNodeRef}
      style={drag.style}
      className={cn(
        "bg-shell-surface border-shell-border flex flex-col gap-2 rounded-xl border p-2",
        drag.isDragging && "z-10 opacity-80 shadow-md",
        !item.isActive && "opacity-60",
      )}
    >
      {/*
        Identity on the first line, and only identity.

        Measured in the harness at the panel's real 380px: the row has ~305px, and handle (24) +
        thumbnail (56) + size control (130) + hide (32) + delete (32) left the name EIGHT pixels —
        the word in the DOM for a screen reader and invisible to everyone else. A first attempt
        swapped the 112px select for three glyphs and made it WORSE, at 130. The control does not
        fit beside the name at any spelling, so it stops trying: the name gets the line.
      */}
      <div className="flex items-center gap-2">
      {/*
        The handle carries the drag, and it carries `attributes` with it: dnd-kit puts the role,
        the tab stop and the described-by on whatever it is spread onto, so splitting them from the
        listeners would leave a control that announces as draggable and cannot be driven.
      */}
      <button
        type="button"
        aria-label={`${text.dragHandle}: ${name}`}
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none rounded-md p-1"
        {...drag.handleProps}
      >
        <GripVerticalIcon aria-hidden="true" className="size-4" />
      </button>

      <span className="bg-muted text-muted-foreground flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" aria-hidden="true" className="size-full object-cover" />
        ) : (
          <KindIcon aria-hidden="true" className="size-4" />
        )}
      </span>

      {/*
        The name is the way in to editing, where there is anything to edit. A row that is a button
        and a row that is not look the same until the pointer is over them, which is what stops the
        list reading as five buttons and two labels.
      */}
      {onEdit ? (
        <button
          type="button"
          onClick={() => onEdit(item.id)}
          className="focus-visible:ring-ring flex min-w-0 flex-1 flex-col rounded-md px-1 text-left outline-none hover:underline focus-visible:ring-2"
        >
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="text-muted-foreground truncate text-xs">
            {item.empty ? text.emptyBlock : text.kinds[item.kind]}
          </span>
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col px-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {item.empty ? text.emptyBlock : text.kinds[item.kind]}
          </p>
        </div>
      )}


      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`${item.isActive ? text.hide : text.show}: ${name}`}
        aria-pressed={item.isActive}
        onClick={() => onToggle(item.id, !item.isActive)}
      >
        {item.isActive ? (
          <EyeIcon aria-hidden="true" className="size-4" />
        ) : (
          <EyeOffIcon aria-hidden="true" className="size-4" />
        )}
      </Button>

      {onDelete && item.deletable !== false ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`${text.deleteBlock}: ${name}`}
          onClick={() => onDelete(item.id)}
        >
          <Trash2Icon aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
      </div>

      {hasLayout(item) ? (
        /*
          The second line, because it does not fit on the first at any spelling.

          Glyphs rather than a select because each one says its own name, the way
          `align-field.tsx` already does — but that was NOT what bought the name its width:
          measured, the group is 130px against the select's 112, so the swap alone made it worse.
          What bought it was leaving the line.
        */
        <ToggleGroup
          multiple={false}
          aria-label={`${text.sizeLabel}: ${name}`}
          variant="outline"
          className="shrink-0"
          value={[item.layout]}
          onValueChange={(next: string[]) => {
            const chosen = next[0]
            if (chosen === "FULL" || chosen === "HALVES" || chosen === "THIRDS") {
              onLayoutChange(item.id, chosen)
            }
          }}
        >
          <ToggleGroupItem value="FULL" aria-label={text.sizeFull}>
            <RectangleHorizontalIcon aria-hidden="true" className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="HALVES" aria-label={text.sizeHalves}>
            <Columns2Icon aria-hidden="true" className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="THIRDS" aria-label={text.sizeThirds}>
            <Columns3Icon aria-hidden="true" className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      ) : null}
    </li>
  )
}
