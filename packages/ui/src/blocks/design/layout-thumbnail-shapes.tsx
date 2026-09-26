// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import type { ComponentDisplay } from "./design-types"

/*
  The drawings the layout picker offers, one per layout. Apart from the thumbnail's frame so a new
  layout adds a case here and nothing there.
*/

const PICTURE = "rounded-sm bg-primary/60"
const LINE = "rounded-full bg-muted-foreground/40"
const CARD = "rounded-sm bg-muted-foreground/25"

function Lines({ className }: { className?: string }) {
  return (
    <span className={cn("flex flex-col gap-1", className)}>
      <span className={cn(LINE, "h-1.5 w-3/4")} />
      <span className={cn(LINE, "h-1 w-1/2")} />
    </span>
  )
}

/** Each layout drawn small: the arrangement, never the content. */
export function LayoutShape({ display }: { display: ComponentDisplay }) {
  switch (display) {
    // The picture under its words, which sit at its foot.
    case "BACKDROP":
      return (
        <span className={cn(PICTURE, "relative flex h-full w-full items-end p-1.5")}>
          <Lines className="w-2/3 [&>span]:bg-background/80" />
        </span>
      )
    // Words on one side, the picture on the other.
    case "SPLIT":
      return (
        <span className="flex h-full w-full items-center gap-1.5">
          <span className={cn(PICTURE, "h-full flex-1")} />
          <Lines className="flex-1" />
        </span>
      )
    // One picture at a time, and the dots that say there are more.
    case "CAROUSEL":
      return (
        <span className="flex h-full w-full flex-col gap-1">
          <span className={cn(PICTURE, "w-full flex-1")} />
          <span className="flex justify-center gap-0.5">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className={cn("size-1 rounded-full", dot === 0 ? "bg-primary/70" : "bg-muted-foreground/40")} />
            ))}
          </span>
        </span>
      )
    case "GRID":
      return (
        <span className="grid h-full w-full grid-cols-3 gap-1">
          {Array.from({ length: 6 }, (_, at) => (
            <span key={at} className={CARD} />
          ))}
        </span>
      )
    // One row, the last card cut by the edge: it scrolls.
    case "RAIL":
      return (
        <span className="flex h-full w-full gap-1 overflow-hidden">
          {[0, 1, 2, 3].map((at) => (
            <span key={at} className={cn(CARD, "h-full w-[30%] shrink-0")} />
          ))}
        </span>
      )
    case "CHIPS":
      return (
        <span className="flex h-full w-full flex-wrap content-center gap-1">
          {["w-8", "w-6", "w-10", "w-7", "w-9"].map((width, at) => (
            <span key={at} className={cn("h-2.5 rounded-full border border-muted-foreground/50", width)} />
          ))}
        </span>
      )
    // An icon beside its words, in a tinted band.
    case "INLINE":
      return (
        <span className="bg-muted flex h-full w-full items-center justify-around rounded-sm px-1">
          {[0, 1, 2].map((at) => (
            <span key={at} className="flex items-center gap-0.5">
              <span className="bg-primary/60 size-2 rounded-full" />
              <span className={cn(LINE, "h-1 w-4")} />
            </span>
          ))}
        </span>
      )
    case "CARDS":
      return (
        <span className="grid h-full w-full grid-cols-3 gap-1">
          {[0, 1, 2].map((at) => (
            <span key={at} className="border-muted-foreground/40 flex flex-col items-center justify-center gap-1 rounded-sm border">
              <span className="bg-primary/60 size-2 rounded-full" />
              <span className={cn(LINE, "h-1 w-2/3")} />
            </span>
          ))}
        </span>
      )
    // A strip: still words, centred.
    case "STATIC":
      return (
        <span className="flex h-full w-full items-center">
          <span className="bg-primary/60 flex h-3 w-full items-center justify-center gap-2 rounded-sm">
            <span className="bg-background/80 h-1 w-6 rounded-full" />
            <span className="bg-background/80 h-1 w-4 rounded-full" />
          </span>
        </span>
      )
    // A strip whose words run off its edge: they move.
    case "MARQUEE":
      return (
        <span className="flex h-full w-full items-center">
          <span className="bg-primary/60 flex h-3 w-full items-center gap-2 overflow-hidden rounded-sm pl-4">
            {[0, 1, 2, 3].map((at) => (
              <span key={at} className="bg-background/80 h-1 w-6 shrink-0 rounded-full" />
            ))}
          </span>
        </span>
      )
    // Rows that open one at a time: the first open over its answer, the others closed.
    case "ACCORDION":
      return (
        <span className="flex h-full w-full flex-col justify-center gap-1">
          {[0, 1, 2].map((at) => (
            <span key={at} className={cn("flex flex-col gap-0.5 rounded-sm px-1", at === 0 && "bg-muted")}>
              <span className="flex items-center gap-1">
                <span className={cn(LINE, "h-1 flex-1")} />
                <span className="bg-primary/60 size-1 rounded-full" />
              </span>
              {at === 0 ? <span className={cn(LINE, "h-0.5 w-2/3")} /> : null}
            </span>
          ))}
        </span>
      )
    // A strip of colour from edge to edge, the words and the button centred on it.
    case "BAND":
      return (
        <span className="bg-primary/60 flex h-full w-full flex-col items-center justify-center gap-1">
          <span className="bg-background/80 h-1 w-1/2 rounded-full" />
          <span className="bg-background h-1.5 w-1/4 rounded-full" />
        </span>
      )
    // One tinted card inside the margins.
    case "CARD":
      return (
        <span className="flex h-full w-full items-center px-2">
          <span className="bg-primary/20 flex h-full w-full flex-col items-center justify-center gap-1 rounded-md">
            <span className={cn(LINE, "h-1 w-1/2")} />
            <span className="bg-primary/70 h-1.5 w-1/4 rounded-full" />
          </span>
        </span>
      )
    // The picture on one side of the words, the side the name says.
    case "IMAGE_LEFT":
    case "IMAGE_RIGHT":
      return (
        <span className={cn("flex h-full w-full items-center gap-1.5", display === "IMAGE_RIGHT" && "flex-row-reverse")}>
          <span className={cn(PICTURE, "h-full w-2/5 shrink-0")} />
          <Lines className="flex-1" />
        </span>
      )
    // The picture wide, the words under it.
    case "IMAGE_LARGE":
      return (
        <span className="flex h-full w-full flex-col items-center gap-1">
          <span className={cn(PICTURE, "w-full flex-1")} />
          <span className={cn(LINE, "h-1 w-1/2")} />
        </span>
      )
    // A box that fits a slice, drawn smaller than the frame around it.
    case "BLOCK":
      return (
        <span className="flex h-full w-full items-center justify-center">
          <span className="border-muted-foreground/40 flex h-full w-3/5 flex-col items-center justify-center gap-1 rounded-sm border">
            <span className={cn(LINE, "h-1 w-1/2")} />
            <span className="bg-primary/60 h-1.5 w-3/4 rounded-full" />
          </span>
        </span>
      )
    // A layout added without a drawing fails the build here instead of drawing an empty frame.
    default:
      return (display satisfies never) && null
  }
}
