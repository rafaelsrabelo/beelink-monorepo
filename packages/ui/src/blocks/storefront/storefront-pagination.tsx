// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontPaginationProps {
  /** 1-based, as the catalogue counts. Outside the range it is clamped, never rendered blank. */
  page: number
  pageCount: number
  /** `(page) => href`, built by the screen: a block never knows the query is spelled `pagina`. */
  href: (page: number) => string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** The dictionary is plain data, so filling its markers is the block's job and not the locale's. */
function fill(template: string, values: Record<string, number>): string {
  return Object.entries(values).reduce(
    (text, [marker, value]) => text.replaceAll(`{${marker}}`, String(value)),
    template,
  )
}

/** "‹ Anterior" and "Próxima ›": 40px tall, bordered like the digits. */
const STEP = "flex h-10 items-center gap-1 rounded-[10px] border border-shop-line-strong bg-shop-background px-3.5 transition-colors"

const GAP = "gap"
type Slot = number | typeof GAP

/**
 * The first page, the last one, the current one and its two neighbours — eight entries at most,
 * whatever the catalogue's size. At either end the current page has one neighbour, so the window
 * reaches one further inward: page 1 of 40 offers 1 2 3 … 40, as 5a draws it. A shop with forty pages that prints forty links has stopped being
 * navigation and become a wall, and on a phone it wraps into four rows nobody reads.
 *
 * A jump that skips a single page is written out instead of elided: "…" costs the same width as
 * the digit it is hiding, so eliding one is width spent to say less.
 */
function slotsAround(page: number, pageCount: number): Slot[] {
  const inward = page === 1 ? [3] : page === pageCount ? [pageCount - 2] : []
  const shown = [1, page - 1, page, page + 1, pageCount, ...inward]
    .filter((candidate) => candidate >= 1 && candidate <= pageCount)
    .sort((a, b) => a - b)

  const slots: Slot[] = []
  let previous = 0

  for (const current of shown) {
    if (current === previous) continue
    if (previous && current - previous === 2) slots.push(previous + 1)
    else if (previous && current - previous > 2) slots.push(GAP)

    slots.push(current)
    previous = current
  }

  return slots
}

/**
 * Which page of the catalogue you are on, and how to get to another one.
 *
 * Links, never buttons with handlers: `?pagina=2` is an address, so it is shareable, indexable and
 * already working before any JavaScript arrives — the same reason the categories band is links.
 *
 * Where pagination usually fails a screen reader is the numbered links: their visible text is one
 * digit, which announces as "3, link" with nothing saying three of what. Each one carries its own
 * name instead, and the nav says what the row of digits is for.
 */
export function StorefrontPagination({
  page,
  pageCount,
  href,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontPaginationProps) {
  const text = messages.storefront

  // One page is not a choice, and a control offering the page you are already on reads as broken.
  if (pageCount <= 1) return null

  // A hand-typed `?pagina=0` or `?pagina=999` is a visitor, not an attack: put them on a real page
  // rather than rendering a row with nothing marked current.
  const current = Math.min(Math.max(Math.trunc(page) || 1, 1), pageCount)

  return (
    <nav
      aria-label={text.paginationLabel}
      className="flex w-full flex-wrap items-center justify-center gap-1.5 py-2 text-sm text-shop-on-background"
    >
      {/* The window hides most of the catalogue, so someone who cannot see the row hears where
          they landed before hearing a handful of digits. */}
      <p className="sr-only">{fill(text.paginationStatus, { current, total: pageCount })}</p>

      {/* No previous page means no link. 5a keeps the word in place, muted, so the row does not
          shift between page 1 and page 2 — but as text a reader skips: a disabled anchor is not a
          thing HTML has, and it would still be offered, promising a page that does not exist. */}
      {current > 1 ? (
        <Link href={href(current - 1)} rel="prev" className={cn(STEP, "hover:border-shop-primary")}>
          <span aria-hidden="true">‹</span> {text.paginationPrevious}
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(STEP, "text-shop-muted")}>
          ‹ {text.paginationPrevious}
        </span>
      )}

      <ol className="flex items-center gap-1.5">
        {slotsAround(current, pageCount).map((slot, index) =>
          slot === GAP ? (
            <li key={`${GAP}-${index}`} aria-hidden="true" className="px-1 text-shop-muted">
              …
            </li>
          ) : (
            <li key={slot}>
              <Link
                href={href(slot)}
                // The visible text is a digit; this is the whole name, and it still contains
                // that digit so a voice-control user can say what they read.
                aria-label={fill(text.paginationPage, { page: slot })}
                aria-current={slot === current ? "page" : undefined}
                className={cn(
                  "flex h-10 min-w-10 items-center justify-center rounded-[10px] border px-1.5 tabular-nums transition-colors",
                  slot === current
                    ? "border-transparent bg-shop-text font-bold text-shop-on-text"
                    : "border-shop-line-strong bg-shop-background hover:border-shop-primary",
                )}
              >
                {slot}
              </Link>
            </li>
          ),
        )}
      </ol>

      {current < pageCount ? (
        <Link href={href(current + 1)} rel="next" className={cn(STEP, "font-semibold hover:border-shop-primary")}>
          {text.paginationNext} <span aria-hidden="true">›</span>
        </Link>
      ) : null}
    </nav>
  )
}
