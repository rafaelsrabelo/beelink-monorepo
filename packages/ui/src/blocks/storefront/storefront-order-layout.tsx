// React
import type { ReactNode } from "react"

export interface StorefrontOrderLayoutProps {
  header: ReactNode
  status: ReactNode
  history: ReactNode
  /** The lines, the payment and the address, in that order. */
  aside: ReactNode
}

/**
 * An order's page as 6e and 6f lay it out: the top and the status across, then the history beside a
 * 400px column of lines, payment and address. A phone stacks them with the column first — what was
 * bought and where it goes before the log of what happened (6f).
 */
export function StorefrontOrderLayout({ header, status, history, aside }: StorefrontOrderLayoutProps) {
  return (
    <div className="flex flex-col gap-5 py-4 shop-lg:py-6">
      {header}
      {status}
      {/* The column first in the source, as the phone reads it; from `shop-lg` it moves to the right. */}
      <div className="flex flex-col gap-5 shop-lg:flex-row-reverse shop-lg:items-start">
        <div className="flex w-full flex-col gap-4 shop-lg:w-[400px] shop-lg:shrink-0">{aside}</div>
        <div className="min-w-0 flex-1">{history}</div>
      </div>
    </div>
  )
}
