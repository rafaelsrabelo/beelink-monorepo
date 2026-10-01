// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

export interface LandingShellProps {
  children: ReactNode
  className?: string
}

/**
 * The landing's ground: Beelink's cream, its ink and its own typeface, which the screen hands over
 * as `--font-brand` — the panel stays in its own. The two yellow lines in the corner are the
 * design's, drawn where there is room for them.
 */
export function LandingShell({ children, className }: LandingShellProps) {
  return (
    <div className={cn("relative min-h-svh overflow-x-clip bg-brand-ground text-brand-ink", className)} style={{ fontFamily: "var(--font-brand, inherit)" }}>
      <svg aria-hidden="true" width="420" height="420" viewBox="0 0 420 420" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute -top-10 -right-[60px] hidden text-brand-yellow md:block">
        <path d="M80 0 C80 60 110 90 160 120 L420 280" />
        <path d="M220 0 C220 40 240 60 280 85 L420 170" />
      </svg>
      {children}
    </div>
  )
}
