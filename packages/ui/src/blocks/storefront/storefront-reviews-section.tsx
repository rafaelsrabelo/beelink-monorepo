// React
import type { ReactNode } from "react"

export interface StorefrontReviewsSectionProps {
  title: string
  /** Under the title: why it matters, or that there is nothing in it. */
  hint?: string
  children?: ReactNode
}

/** One of Avaliar compras' two parts (6c): "Para avaliar" and "Suas avaliações", a heading over their cards. */
export function StorefrontReviewsSection({ title, hint, children }: StorefrontReviewsSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {hint ? <p className="text-sm text-shop-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}
