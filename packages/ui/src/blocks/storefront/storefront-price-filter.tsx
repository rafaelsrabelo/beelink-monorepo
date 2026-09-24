"use client"

// React
import { useId, useRef, useState } from "react"

// UI
import { Slider } from "@harness-monorepo/ui/components/slider"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontFilterSection } from "./storefront-filter-section"

export interface StorefrontPriceRange {
  label: string
  href: string
  /** When the address's minimum and maximum are exactly this range's. */
  selected: boolean
}

export interface StorefrontPriceFilterProps {
  /** The quick ranges that fall inside what the shelf costs. */
  ranges: readonly StorefrontPriceRange[]
  /** The shelf's own address: the min/max form asks for it again. */
  action: string
  /** Every other filter, carried through; the page is not one — a new range starts at 1. */
  fields?: readonly (readonly [string, string])[]
  /** The cheapest and dearest on the shelf, whole reais. No slider without two different ends. */
  bounds?: { min: number; max: number } | null
  /** What the address asks for now, whole reais. */
  value?: { min?: number; max?: number }
  locale: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const FIELD = "flex h-9 w-[76px] items-center gap-1 rounded-lg border border-shop-line-strong bg-shop-background px-2 text-sm text-shop-on-background"

/**
 * 5a's "Preço" group: quick ranges as links, a two-thumb slider and a min/max form with "Ir".
 *
 * The form is the whole of it with scripting off — a GET on the shelf's address. The slider only
 * fills the form: it applies when a thumb is let go, never on every step, by submitting that same
 * form, which the listing's island then follows without a full load.
 */
export function StorefrontPriceFilter({
  ranges,
  action,
  fields = [],
  bounds,
  value = {},
  locale,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontPriceFilterProps) {
  const text = messages.storefront
  const form = useRef<HTMLFormElement>(null)
  const id = useId()
  const [low, setLow] = useState(value.min !== undefined ? String(value.min) : "")
  const [high, setHigh] = useState(value.max !== undefined ? String(value.max) : "")
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
  const slides = bounds && bounds.max > bounds.min
  const clamp = (entry: number, fallback: number) => (Number.isFinite(entry) ? Math.min(Math.max(entry, bounds?.min ?? 0), bounds?.max ?? 0) : fallback)
  const thumbs = slides ? [clamp(Number(low || Number.NaN), bounds.min), clamp(Number(high || Number.NaN), bounds.max)] : []

  return (
    <StorefrontFilterSection title={text.filterPrice}>
      {ranges.length ? (
        <ul className="flex flex-col gap-1.5 text-sm">
          {ranges.map((range) => (
            <li key={range.label}>
              <Link href={range.href} aria-current={range.selected ? "true" : undefined} className={cn("hover:underline", range.selected && "font-bold")}>
                {range.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {slides ? (
        <Slider
          value={thumbs}
          min={bounds.min}
          max={bounds.max}
          step={1}
          // A thumb left at the shelf's own end is no limit at all, and the address says nothing of it.
          onValueChange={(next) => {
            const [from, to] = next as number[]
            setLow(from === undefined || from <= bounds.min ? "" : String(from))
            setHigh(to === undefined || to >= bounds.max ? "" : String(to))
          }}
          onValueCommitted={() => requestAnimationFrame(() => form.current?.requestSubmit())}
          getAriaLabel={(index) => (index === 0 ? text.filterPriceLowest : text.filterPriceHighest)}
          getAriaValueText={(_, entry) => money.format(entry)}
          className="mx-2 mt-1.5 [&_[data-slot=slider-range]]:bg-shop-primary [&_[data-slot=slider-thumb]]:size-[18px] [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-shop-primary [&_[data-slot=slider-thumb]]:bg-shop-background [&_[data-slot=slider-track]]:bg-[color-mix(in_oklab,var(--shop-on-background)_15%,transparent)]"
        />
      ) : null}

      <form ref={form} action={action} method="get" className="flex items-end gap-2">
        {fields.map(([key, entry], index) => (
          <input key={`${key}-${index}`} type="hidden" name={key} value={entry} />
        ))}
        <div className="flex flex-col gap-0.5 text-xs text-shop-muted">
          <label htmlFor={`${id}-min`}>{text.filterPriceMin}</label>
          <span className={FIELD}>
            <span aria-hidden="true" className="text-shop-muted">R$</span>
            <input id={`${id}-min`} name="precoMin" inputMode="decimal" value={low} onChange={(event) => setLow(event.target.value)} className="w-full min-w-0 bg-transparent outline-none" />
          </span>
        </div>
        <span aria-hidden="true" className="pb-2 text-shop-muted">–</span>
        <div className="flex flex-col gap-0.5 text-xs text-shop-muted">
          <label htmlFor={`${id}-max`}>{text.filterPriceMax}</label>
          <span className={FIELD}>
            <span aria-hidden="true" className="text-shop-muted">R$</span>
            <input id={`${id}-max`} name="precoMax" inputMode="decimal" value={high} onChange={(event) => setHigh(event.target.value)} className="w-full min-w-0 bg-transparent outline-none" />
          </span>
        </div>
        <button type="submit" className="h-9 rounded-lg border border-shop-line-strong bg-shop-background px-3 text-sm font-semibold text-shop-on-background">
          {text.filterPriceApply}
        </button>
      </form>
    </StorefrontFilterSection>
  )
}
