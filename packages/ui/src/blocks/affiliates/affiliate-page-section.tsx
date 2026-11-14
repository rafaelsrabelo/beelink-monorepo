// React
import { useId, type ReactNode } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

export interface AffiliatePageSectionProps {
  title: string
  /** What brings the section's texts back to the product's own. */
  restoreLabel: string
  onRestore: () => void
  disabled?: boolean
  children: ReactNode
}

/** One part of the page's editor (plan 2026-11-14), titled, with its way back to the product's texts. */
export function AffiliatePageSection({ title, restoreLabel, onRestore, disabled = false, children }: AffiliatePageSectionProps) {
  const id = useId()

  return (
    <section aria-labelledby={id} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="font-semibold">
          {title}
        </h2>
        <Button type="button" variant="link" size="sm" disabled={disabled} onClick={onRestore} aria-describedby={id}>
          {restoreLabel}
        </Button>
      </div>
      {children}
    </section>
  )
}
