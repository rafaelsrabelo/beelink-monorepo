// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

/** The description's section: "Ver descrição completa" in the info column lands on it. */
export const PRODUCT_DESCRIPTION_ID = "descricao"

/** A lower section's heading, as 5b sets every one of them: 22px, 800. */
export const PRODUCT_SECTION_HEADING = "text-[22px] leading-[1.2] font-extrabold"

export interface StorefrontProductSectionProps {
  /** An anchor for links on the page to land on: `descricao`. */
  id?: string
  /** Its heading; a section holding two headings of its own passes none and draws them. */
  title?: string
  className?: string
  children: ReactNode
}

/**
 * One of the product page's lower sections, as 5b frames them all: a hairline across the content
 * width, 28px above and below, and a 22px heading. It lands below the sticky header when a link on
 * the page jumps to it, rather than under it.
 */
export function StorefrontProductSection({ id, title, className, children }: StorefrontProductSectionProps) {
  const headingId = id && title ? `${id}-titulo` : undefined

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("flex scroll-mt-[calc(var(--shop-masthead-height,117px)+16px)] flex-col gap-3 border-t border-shop-line py-7", className)}
    >
      {title ? (
        <h2 id={headingId} className={PRODUCT_SECTION_HEADING}>
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  )
}
