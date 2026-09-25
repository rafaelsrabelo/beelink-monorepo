// React
import type { ReactNode } from "react"

export interface StorefrontFilterSectionProps {
  title: string
  children: ReactNode
}

/**
 * One group of 5a's filter column — "Categoria", "Preço", "Sabor": always open, no chevron, a
 * hairline below. The column draws none for a group with nothing to offer; this never draws empty.
 */
export function StorefrontFilterSection({ title, children }: StorefrontFilterSectionProps) {
  return (
    <section className="flex flex-col gap-2 border-b border-shop-line py-4 last:border-b-0">
      <h3 className="text-[15px] font-bold">{title}</h3>
      {children}
    </section>
  )
}
