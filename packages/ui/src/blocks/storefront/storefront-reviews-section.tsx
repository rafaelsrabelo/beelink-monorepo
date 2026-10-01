// React
import type { ReactNode } from "react"

export interface StorefrontReviewsSectionProps {
  title: string
  /** Under the title: why it matters, or that there is nothing in it. */
  hint?: string
  /** Beside the title: the way to the rest, where a part shows only the first few. */
  aside?: ReactNode
  children?: ReactNode
}

/**
 * A heading over review cards (6c): Avaliar compras' "Para avaliar" and "Suas avaliações", and the
 * account front's "Avalie suas compras".
 */
export function StorefrontReviewsSection({ title, hint, aside, children }: StorefrontReviewsSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-extrabold">{title}</h2>
          {hint ? <p className="text-sm text-shop-muted">{hint}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}
