// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface BeelinkMarkProps {
  /** The design draws it at 3.2 to 3.6 over a 40px box, by where it sits. */
  strokeWidth?: number
  className?: string
}

/**
 * Beelink's mark, as the landing's design draws it by hand — the official artwork has not arrived,
 * and this is the one place to swap it. It takes the colour of the text around it, and says nothing
 * to a reader: the name beside it, or the link's label, does.
 */
export function BeelinkMark({ strokeWidth = 3.4, className }: BeelinkMarkProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true" className={cn("size-10", className)}>
      <path d="M5 3V37H25A12 12 0 0 0 25 13H15" />
      <path d="M15 3V28H25A5.5 5.5 0 0 0 25 17H20" />
    </svg>
  )
}
