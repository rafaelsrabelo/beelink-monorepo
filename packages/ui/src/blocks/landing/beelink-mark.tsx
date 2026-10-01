// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface BeelinkMarkProps {
  className?: string
}

/**
 * Beelink's mark, drawn from the official artwork (`logo.png`, 01/10/2026): the outer "b" and the
 * one inside it, measured off the file and written as two strokes. A vector rather than the bitmap,
 * so it takes the colour of the text around it — ink on the cream, light on the black — and stays
 * sharp at the 380px the final call draws it at. It says nothing to a reader: the name beside it, or
 * the link's label, does.
 *
 * The box is the artwork's, wider than tall: in a square it is as wide as the square.
 */
export function BeelinkMark({ className }: BeelinkMarkProps) {
  return (
    <svg viewBox="0 0 437 370" fill="none" stroke="currentColor" strokeWidth={40} aria-hidden="true" className={cn("size-10", className)}>
      <path d="M22 0V350H277A140 140 0 0 0 277 70H108" />
      <path d="M108 0V279H253A70 70 0 0 0 253 139H189" />
    </svg>
  )
}
