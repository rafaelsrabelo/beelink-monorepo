// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { BAND } from "./storefront-band"

export interface StorefrontBenefit {
  id: string
  title: string
  detail?: string | null
  /**
   * A node and not an icon name, for the reason this package states everywhere else: a table
   * mapping "qr-code" to a glyph is the design system knowing what PIX is. The screen resolves the
   * name it stored against the closed table and hands the result down.
   */
  icon?: ReactNode
}

export interface StorefrontBenefitsProps {
  items: readonly StorefrontBenefit[]
}

/**
 * The band of promises under the cover — free delivery, PIX, thirty days to change your mind.
 *
 * It used to be derived: four fixed rows keyed by the shop's payment methods, with the platform's
 * words and the platform's icons. It is the shopkeeper's own writing now, which is what lets a
 * shop promise something the platform never thought of.
 *
 * Empty draws nothing, and that is the whole off switch: a band with no rows is a band the
 * shopkeeper emptied, not an empty strip to look at.
 */
export function StorefrontBenefits({ items }: StorefrontBenefitsProps) {
  if (!items.length) return null

  return (
    <div
      className="w-full"
      style={{ backgroundColor: "color-mix(in oklab, var(--shop-header) 10%, transparent)" }}
    >
      <ul className={cn(BAND, "grid grid-cols-2 gap-x-6 gap-y-5 py-6 sm:grid-cols-4")}>
        {items.map((item) => (
          // Icon beside the words and not above them: four stacked icons read as a row of buttons,
          // and none of these is one. Left-aligned for the same reason — a centred two-line block
          // with a mark on top is a feature grid, and this is a receipt.
          <li key={item.id} className="flex items-center gap-3">
            {item.icon ? (
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: "color-mix(in oklab, var(--shop-primary) 14%, transparent)",
                  color: "var(--shop-primary)",
                }}
              >
                {item.icon}
              </span>
            ) : null}
            <div className="flex min-w-0 flex-col">
              <p className="text-sm font-semibold">{item.title}</p>
              {item.detail ? <p className="text-xs opacity-70">{item.detail}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
