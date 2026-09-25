"use client"

// React
import { useState, type ReactNode } from "react"

// Libs
import { SlidersHorizontalIcon, XIcon } from "lucide-react"

// UI
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@harness-monorepo/ui/components/sheet"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { useShopPalette } from "./shop-palette-context"

export interface StorefrontFilterSheetProps {
  /** Filters in force, less the route's category and the searched term: the chips' count. */
  applied: number
  /** The shelf's total as it now stands — it follows each filter as the page answers it. */
  total: number
  locale: string
  /** The same groups the desktop's column draws. */
  children: ReactNode
  messages?: UiMessages
}

/**
 * The phone's door to 5a's filters: "Filtrar (N)" opens the column's groups in a sheet from the
 * bottom, and "Ver N resultados" closes it on the shelf as it now stands. Each group inside is the
 * desktop's own links, so a tick narrows the shelf behind the sheet while it stays open.
 *
 * Base UI returns focus to the button when it closes and closes it on Esc. Portaled out of the
 * window, so the shop's palette comes along.
 */
export function StorefrontFilterSheet({ applied, total, locale, children, messages = defaultMessages }: StorefrontFilterSheetProps) {
  const text = messages.storefront
  const palette = useShopPalette()
  const [open, setOpen] = useState(false)
  const count = new Intl.NumberFormat(locale).format(total)
  const results = total === 0 ? text.filtersShowResultsNone : total === 1 ? text.filtersShowResultsOne : format(text.filtersShowResults, { count })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 self-start rounded-[10px] border border-shop-line-strong bg-shop-background px-3.5 text-sm font-semibold text-shop-on-background"
          />
        }
      >
        <SlidersHorizontalIcon aria-hidden="true" className="size-4" />
        {applied ? format(text.filtersOpenCount, { n: String(applied) }) : text.filtersOpen}
      </SheetTrigger>

      <SheetContent
        side="bottom"
        showCloseButton={false}
        style={palette}
        className="max-h-[85dvh] gap-0 rounded-t-2xl bg-shop-background text-shop-on-background"
      >
        <SheetHeader className="flex-row items-center justify-between border-b border-shop-line px-4 py-3">
          <SheetTitle className="text-lg font-extrabold text-shop-on-background">{text.filtersTitle}</SheetTitle>
          <SheetClose render={<button type="button" aria-label={text.filtersClose} className="rounded-md p-1.5 text-shop-muted" />}>
            <XIcon aria-hidden="true" className="size-5" />
          </SheetClose>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4">{children}</div>

        <SheetFooter className="border-t border-shop-line px-4 py-3">
          <SheetClose render={<button type="button" className="h-11 w-full rounded-[10px] bg-shop-primary text-sm font-semibold text-shop-on-primary" />}>
            {results}
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
