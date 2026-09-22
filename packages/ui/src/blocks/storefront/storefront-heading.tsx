// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface StorefrontHeadingProps {
  title?: string | null
  subtitle?: string | null
  /** `h2` on a landing page, where the shop's own name is already the `h1`. */
  as?: "h2" | "h3"
  className?: string
}

/**
 * A sign the shopkeeper put on the page: a heading and a line under it.
 *
 * It draws nothing when there is no title — an empty block is a block the shopkeeper is still
 * filling in, and a landing page that shows a bare rule where a heading will go is worse than one
 * that shows nothing yet.
 *
 * Centred, unlike every other heading on the shop window. A rail's heading sits over a row of
 * cards and belongs at their left edge; this one has nothing under it but the next block, and a
 * left-aligned heading with empty space to its right reads as a heading missing its content.
 */
export function StorefrontHeading({
  title,
  subtitle,
  as: Tag = "h2",
  className,
}: StorefrontHeadingProps) {
  if (!title && !subtitle) return null

  return (
    <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
      {title ? <Tag className="text-2xl font-semibold text-balance sm:text-3xl">{title}</Tag> : null}
      {subtitle ? <p className="max-w-2xl text-sm opacity-75 sm:text-base">{subtitle}</p> : null}
    </div>
  )
}
