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

const GAP = "gap"
type Slot = number | typeof GAP

/**
 * The first page, the last one, the current one and its two neighbours — eight entries at most,
 * whatever the catalogue's size. A shop with forty pages that prints forty links has stopped being
 * navigation and become a wall, and on a phone it wraps into four rows nobody reads.
 *
 * A jump that skips a single page is written out instead of elided: "…" costs the same width as
 * the digit it is hiding, so eliding one is width spent to say less.
 */
function slotsAround(page: number, pageCount: number): Slot[] {
  const shown = [1, page - 1, page, page + 1, pageCount]
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
      className="flex w-full flex-wrap items-center justify-center gap-1 py-6 text-sm"
    >
      {/* The window hides most of the catalogue, so someone who cannot see the row hears where
          they landed before hearing a handful of digits. */}
      <p className="sr-only">{fill(text.paginationStatus, { current, total: pageCount })}</p>

      {/* No previous page means no link at all. A disabled anchor is not a thing HTML has: it
          keeps its place in the tab order and a reader still offers it, promising a page that
          does not exist. */}
      {current > 1 ? (
        <Link
          href={href(current - 1)}
          rel="prev"
          className="rounded-xl px-3 py-2 font-medium transition-colors hover:bg-black/5"
        >
          {text.paginationPrevious}
        </Link>
      ) : null}

      <ol className="flex items-center gap-1">
        {slotsAround(current, pageCount).map((slot, index) =>
          slot === GAP ? (
            <li key={`${GAP}-${index}`} aria-hidden="true" className="px-2 opacity-50">
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
                  "flex min-w-9 items-center justify-center rounded-xl px-3 py-2 tabular-nums transition-colors",
                  slot === current ? "font-semibold" : "opacity-70 hover:bg-black/5",
                )}
                style={
                  slot === current
                    ? { backgroundColor: "var(--shop-primary)", color: "var(--shop-on-primary)" }
                    : undefined
                }
              >
                {slot}
              </Link>
            </li>
          ),
        )}
      </ol>

      {current < pageCount ? (
        <Link
          href={href(current + 1)}
          rel="next"
          className="rounded-xl px-3 py-2 font-medium transition-colors hover:bg-black/5"
        >
          {text.paginationNext}
        </Link>
      ) : null}
    </nav>
  )
}
