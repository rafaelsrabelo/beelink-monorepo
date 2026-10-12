// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { BrandLines } from "./brand-lines"
import { LANDING_FOCUS_RING } from "./landing-styles"

export interface LandingShellProps {
  children: ReactNode
  /**
   * What stands at the foot of the screen while the page scrolls under it — the cookie notice. It is
   * written first in the document, so a keyboard and a screen reader meet it before the page, and is
   * laid last by its own `order`.
   */
  notice?: ReactNode
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
 *
 * A column, with or without a notice: `landing-consent` goes to its end by `order` and sticks to the
 * foot of the screen from there, which only a flex item can do. `overflow-x-clip` and never
 * `overflow-x-hidden` for the same notice — a clip makes no scroll container, and a sticky child
 * of one would stick to the shell instead of to the screen.
 */
export function LandingShell({ children, notice, className }: LandingShellProps) {
  return (
    <div data-smooth-anchors="" className={cn(LANDING_FOCUS_RING, "relative flex min-h-svh flex-col overflow-x-clip bg-brand-ground text-brand-ink", className)} style={{ fontFamily: "var(--font-brand, inherit)" }}>
      {notice}
      <BrandLines className="-top-10 -right-[60px] hidden md:block" />
      {children}
    </div>
  )
}
