"use client"

// React
import { useId } from "react"

// Libs
import { MinusIcon, PlusIcon } from "lucide-react"

// UI
import { productImageOf } from "@harness-monorepo/ui/lib/product-image"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** One product a kit may be put together from, as the page draws it. */
export interface StorefrontKitBuilderPart {
  key: string
  name: string
  imageUrl: string | null
  /** False when sold out: listed, marked, and none of it can be chosen. */
  available: boolean
}

export interface StorefrontKitBuilderProps {
  /** How many to pick. */
  size: number
  parts: readonly StorefrontKitBuilderPart[]
  /** How many of each are in the kit now, by the part's key; one missing is none. */
  counts: Readonly<Record<string, number>>
  onChange: (key: string, count: number) => void
  messages?: UiMessages
}

const STEP = "flex size-9 items-center justify-center rounded-full text-shop-on-background disabled:opacity-40"

/**
 * "Monte seu kit" (plan 2026-11-10--kits-monte-seu-kit): the products a kit is put together from,
 * each with − n +, and how many of the kit's size are chosen — announced as it changes. Nothing is
 * added past the size, and nothing of a product that ran out. A product may be chosen as many times
 * as there is room for.
 */
export function StorefrontKitBuilder({ size, parts, counts, onChange, messages = defaultMessages }: StorefrontKitBuilderProps) {
  const text = messages.storefront
  const id = useId()
  const chosen = parts.reduce((sum, part) => sum + (counts[part.key] ?? 0), 0)
  const full = chosen >= size

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={`${id}-title`} className="text-lg font-extrabold">
            {text.kitTitle}
          </h2>
          <p aria-live="polite" className={cn("shrink-0 text-sm font-bold tabular-nums", full ? "text-shop-positive-ink" : "text-shop-muted")}>
            {full ? text.kitComplete : format(text.kitProgress, { count: String(chosen), size: String(size) })}
          </p>
        </div>
        <p className="text-sm text-shop-muted">{format(text.kitChoose, { size: String(size) })}</p>
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-shop-fill">
          <div className="h-full rounded-full bg-shop-primary transition-[width]" style={{ width: `${Math.min(100, (chosen / size) * 100)}%` }} />
        </div>
      </div>

      {parts.length === 0 ? (
        <p className="rounded-[10px] border border-shop-line bg-shop-fill px-4 py-3 text-sm">{text.kitEmpty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 shop-sm:grid-cols-2">
          {parts.map((part) => {
            const count = counts[part.key] ?? 0
            return (
              <li key={part.key} className={cn("flex items-center gap-3 rounded-xl border border-shop-line bg-shop-background p-2", count > 0 && "border-shop-primary", !part.available && "opacity-60")}>
                <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-shop-placeholder">
                  <img src={productImageOf(part.imageUrl)} alt="" className="size-full object-cover" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="line-clamp-2 text-sm font-medium">{part.name}</p>
                  {part.available ? null : <p className="text-xs font-semibold text-shop-sale-ink">{text.soldOut}</p>}
                </div>
                <div role="group" aria-label={format(text.kitPart, { name: part.name })} className="flex shrink-0 items-center rounded-full border border-shop-line-strong">
                  <button type="button" aria-label={format(text.kitRemovePart, { name: part.name })} disabled={count === 0} onClick={() => onChange(part.key, count - 1)} className={STEP}>
                    <MinusIcon aria-hidden="true" className="size-4" />
                  </button>
                  <span className="min-w-6 text-center text-sm font-bold tabular-nums">{count}</span>
                  <button type="button" aria-label={format(text.kitAddPart, { name: part.name })} disabled={full || !part.available} onClick={() => onChange(part.key, count + 1)} className={STEP}>
                    <PlusIcon aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
