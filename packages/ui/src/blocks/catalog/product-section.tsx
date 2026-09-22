// React
import type { ReactNode } from "react"

export interface ProductSectionProps {
  title: string
  hint?: string
  children: ReactNode
}

/**
 * One card of the product form.
 *
 * The form is cut into these rather than being one long column because the pieces are answered at
 * different times: a shopkeeper names the thing and photographs it now, and fills in a parcel's
 * weight the week the shipping integration lands. A card that can be skipped looks skippable.
 */
export function ProductSection({ title, hint, children }: ProductSectionProps) {
  return (
    <section className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-5 shadow-xs">
      <header className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold">{title}</h2>
        {hint ? <p className="text-muted-foreground text-sm">{hint}</p> : null}
      </header>
      {children}
    </section>
  )
}
