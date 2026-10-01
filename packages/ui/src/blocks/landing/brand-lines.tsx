// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface BrandLinesProps {
  className?: string
}

/** The two yellow lines the brand draws in a page's top corner. A picture: it says nothing to a reader, and takes no pointer. */
export function BrandLines({ className }: BrandLinesProps) {
  return (
    <svg aria-hidden="true" width="420" height="420" viewBox="0 0 420 420" fill="none" stroke="currentColor" strokeWidth="2" className={cn("pointer-events-none absolute text-brand-yellow", className)}>
      <path d="M80 0 C80 60 110 90 160 120 L420 280" />
      <path d="M220 0 C220 40 240 60 280 85 L420 170" />
    </svg>
  )
}
