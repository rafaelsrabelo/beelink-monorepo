// React
import type { ReactNode } from "react"

// Block
import { BAND } from "./storefront-band"

export interface StorefrontResultsBandProps {
  /** The trail, "Início › Produtos › Categoria". */
  breadcrumb?: ReactNode
  /** The page's title. The band draws it as the page's `h1`. */
  heading: string
  /** The line beside the title: the count, or what a search found. */
  summary?: ReactNode
  /** What sits at the far end: the sort, and later the display toggle. */
  children?: ReactNode
}

/**
 * The listing's results band as 5a draws it: edge to edge under the menu, on the page's own colour
 * with a hairline below, the trail over a title and its count on the left, the sort on the right.
 * Meant for the window's `pageHeader` slot, which opens the main landmark — so the `h1` is where a
 * reader who skips to the content lands.
 */
export function StorefrontResultsBand({ breadcrumb, heading, summary, children }: StorefrontResultsBandProps) {
  return (
    <div className="border-b border-shop-line bg-shop-background text-shop-on-background">
      <div className={`${BAND} flex flex-wrap items-center gap-4 py-4`}>
        <div className="flex min-w-0 flex-col gap-1">
          {breadcrumb}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-[26px] leading-tight font-extrabold">{heading}</h1>
            {summary}
          </div>
        </div>
        {children ? <div className="ml-auto flex items-center gap-2.5">{children}</div> : null}
      </div>
    </div>
  )
}
