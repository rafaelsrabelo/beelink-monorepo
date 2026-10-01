// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { BrandLines } from "./brand-lines"
import { LANDING_FOCUS_RING } from "./landing-styles"

export interface LandingShellProps {
  children: ReactNode
  className?: string
}

/**
 * The landing's ground: Beelink's cream, its ink and its own typeface, which the screen hands over
 * as `--font-brand` — the panel stays in its own. The two yellow lines in the corner are the
 * design's, drawn where there is room for them. It also draws the focus ring of every control
 * below it, which is why a block seen outside the shell has only the browser's.
 *
 * `data-smooth-anchors` is what `globals.css` reads to make the page's own links — "Soluções",
 * "Ecossistema" — travel to their section instead of cutting to it. The page scrolls, not this
 * element, so the rule has to sit on the document and be asked for from here.
 */
export function LandingShell({ children, className }: LandingShellProps) {
  return (
    <div data-smooth-anchors="" className={cn(LANDING_FOCUS_RING, "relative min-h-svh overflow-x-clip bg-brand-ground text-brand-ink", className)} style={{ fontFamily: "var(--font-brand, inherit)" }}>
      <BrandLines className="-top-10 -right-[60px] hidden md:block" />
      {children}
    </div>
  )
}
