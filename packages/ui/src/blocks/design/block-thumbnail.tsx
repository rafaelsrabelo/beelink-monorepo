// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import type { Across, ComponentKind } from "./design-types"

/**
 * A wireframe of what a kind looks like on the page, drawn for the gallery.
 *
 * One shape per kind, and that is the whole point: the gallery it replaced listed names in a
 * dropdown, so "Produtos" did not say whether it came out as a row or a grid, and the only way to
 * find out was to add it and look. The mock this follows drew the same three bars on every card,
 * which is the same problem wearing a picture.
 *
 * Bars and boxes, never a screenshot: a screenshot of a shop that is not this one is a promise the
 * page will not keep, and it would go stale the first time a block's own drawing changed.
 */
const BAR = "rounded-sm bg-muted-foreground/40"
const ACCENT = "rounded-sm bg-primary/70"

function Shape({ kind, across }: { kind: ComponentKind; across: Across }) {
  switch (kind) {
    // Edge to edge and above everything, which is the one thing that makes it not a heading.
    case "ANNOUNCEMENT":
      return (
        <>
          <span className={cn(ACCENT, "h-1.5 w-full")} />
          <span className={cn(BAR, "h-1.5 w-2/3")} />
          <span className={cn(BAR, "h-1.5 w-1/2")} />
        </>
      )
    // A row of them is drawn as the row: the count is what sets the three banner cards apart.
    case "BANNER":
      return (
        <span className="flex h-full w-full gap-1">
          {Array.from({ length: across }, (_, at) => (
            <span key={at} className={cn(ACCENT, "h-full flex-1")} />
          ))}
        </span>
      )
    case "HEADING":
      return (
        <>
          <span className={cn(BAR, "h-2.5 w-3/5 bg-muted-foreground/70")} />
          <span className={cn(BAR, "h-1.5 w-2/5")} />
        </>
      )
    case "TEXT":
      return (
        <>
          <span className={cn(BAR, "h-1.5 w-full")} />
          <span className={cn(BAR, "h-1.5 w-full")} />
          <span className={cn(BAR, "h-1.5 w-3/5")} />
        </>
      )
    // Three of them side by side is the shape, so the count is the drawing.
    case "BENEFITS":
      return (
        <span className="flex w-full items-center gap-1.5">
          {[0, 1, 2].map((at) => (
            <span key={at} className="flex flex-1 flex-col items-center gap-1">
              <span className="bg-primary/70 size-3 rounded-full" />
              <span className={cn(BAR, "h-1 w-full")} />
            </span>
          ))}
        </span>
      )
    case "CATEGORIES":
      return (
        <span className="grid w-full grid-cols-2 gap-1.5">
          {[0, 1].map((at) => (
            <span key={at} className={cn(BAR, "h-6")} />
          ))}
        </span>
      )
    case "PRODUCTS":
      return (
        <span className="grid w-full grid-cols-3 gap-1">
          {[0, 1, 2].map((at) => (
            <span key={at} className="flex flex-col gap-1">
              <span className={cn(BAR, "h-4")} />
              <span className={cn(BAR, "h-1 w-2/3")} />
            </span>
          ))}
        </span>
      )
    case "CONTACT":
      return (
        <>
          <span className="border-muted-foreground/50 h-2 w-full rounded-sm border" />
          <span className="border-muted-foreground/50 h-2 w-full rounded-sm border" />
          <span className={cn(ACCENT, "h-2 w-2/5")} />
        </>
      )
    // Questions as rows with a chevron; the first one open, its answer under it.
    case "FAQ":
      return (
        <span className="flex w-full flex-col gap-1">
          {[0, 1, 2].map((at) => (
            <span key={at} className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1">
                <span className={cn(BAR, "h-1.5 flex-1 bg-muted-foreground/60")} />
                <span className="bg-primary/70 size-1.5 rounded-full" />
              </span>
              {at === 0 ? <span className={cn(BAR, "h-1 w-3/4")} /> : null}
            </span>
          ))}
        </span>
      )
    // Words centred over a button, on a strip of colour.
    case "CALL_TO_ACTION":
      return (
        <span className="bg-primary/15 flex h-full w-full flex-col items-center justify-center gap-1 rounded-sm">
          <span className={cn(BAR, "h-2 w-1/2 bg-muted-foreground/70")} />
          <span className={cn(BAR, "h-1 w-2/5")} />
          <span className={cn(ACCENT, "h-2 w-1/4 rounded-full")} />
        </span>
      )
    // A picture beside its words.
    case "IMAGE_TEXT":
      return (
        <span className="flex h-full w-full items-center gap-1.5">
          <span className={cn(ACCENT, "h-full w-2/5 shrink-0")} />
          <span className="flex flex-1 flex-col gap-1">
            <span className={cn(BAR, "h-2 w-4/5 bg-muted-foreground/70")} />
            <span className={cn(BAR, "h-1 w-full")} />
            <span className={cn(BAR, "h-1 w-3/5")} />
          </span>
        </span>
      )
    // One product, large: its photo, its name and price, its button.
    case "FEATURED_PRODUCT":
      return (
        <span className="flex h-full w-full items-center gap-1.5">
          <span className={cn(BAR, "aspect-square h-full")} />
          <span className="flex flex-1 flex-col gap-1">
            <span className={cn(BAR, "h-1.5 w-4/5 bg-muted-foreground/70")} />
            <span className={cn(BAR, "h-2 w-2/5")} />
            <span className={cn(ACCENT, "h-2 w-3/5 rounded-full")} />
          </span>
        </span>
      )
    // Four boxes of digits under a line of words.
    case "COUNTDOWN":
      return (
        <span className="flex h-full w-full flex-col items-center justify-center gap-1">
          <span className={cn(BAR, "h-1 w-2/5")} />
          <span className="flex gap-1">
            {[0, 1, 2, 3].map((at) => (
              <span key={at} className={cn(ACCENT, "size-4")} />
            ))}
          </span>
        </span>
      )
    // A kind added without a drawing fails the build here instead of drawing an empty card.
    default:
      return (kind satisfies never) && null
  }
}

export interface BlockThumbnailProps {
  kind: ComponentKind
  /** How many of it share the row. Only a banner is offered more than one at a time. */
  across?: Across
  className?: string
}

/**
 * Decoration, so it is hidden from a screen reader: the card around it already carries the kind's
 * name and what it does as text. Announcing the bars again would read the same card twice.
 */
export function BlockThumbnail({ kind, across = 1, className }: BlockThumbnailProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-muted flex h-16 w-full flex-col items-start justify-center gap-1 overflow-hidden rounded-md p-2",
        className,
      )}
    >
      <Shape kind={kind} across={across} />
    </span>
  )
}
