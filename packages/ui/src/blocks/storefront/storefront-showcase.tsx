// React
import type { ReactNode } from "react"

// Libs
import { ArrowRightIcon } from "lucide-react"

// Locales
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export type StorefrontShowcaseLayout = "FULL" | "HALVES" | "THIRDS"

export interface StorefrontShowcaseItem {
  id: string
  title: string
  subtitle?: string | null
  imageUrl: string
  /** Null makes the card a picture rather than a promise, and no arrow is drawn. */
  href?: string | null
  /**
   * Leaves the shop. It arrives as data rather than being guessed from the address: a block that
   * decided by looking for `http` would start opening the shop's own pages in a new tab the day
   * those addresses became absolute.
   */
  external?: boolean
  layout: StorefrontShowcaseLayout
}

export interface StorefrontShowcaseProps {
  items: readonly StorefrontShowcaseItem[]
  linkComponent?: LinkComponent
  /**
   * Wraps each card, given the card already built. The design preview uses it to make a poster
   * draggable where it stands; the shop passes nothing and the cards render as they always have.
   *
   * A render prop and not a `draggable` flag, because this block must not learn what dnd-kit is:
   * it is the shop window, and the editor's chrome reaches it as a prop or not at all.
   */
  renderItem?: (item: StorefrontShowcaseItem, card: ReactNode) => ReactNode
}

/**
 * Full width for the poster at the top; two across for artwork with room to breathe; three across
 * for a card carrying a name and a line. They all collapse to one on a phone — half of a card this
 * dark is unreadable rather than half as useful.
 */
const COLUMNS: Record<StorefrontShowcaseLayout, string> = {
  FULL: "grid-cols-1",
  HALVES: "grid-cols-1 lg:grid-cols-2",
  THIRDS: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
}

/**
 * A poster that keeps its cinema ratio on a phone is a letterbox two fingers tall with a headline
 * that will not fit, so the full-width one gets taller as the screen gets narrower.
 */
const HEIGHT: Record<StorefrontShowcaseLayout, string> = {
  FULL: "aspect-[4/3] sm:aspect-[2/1] lg:aspect-[21/9]",
  HALVES: "aspect-[16/9]",
  THIRDS: "aspect-[4/3]",
}

/**
 * The shop's own posters on its landing page: a picture, a name, a line and a way in.
 *
 * What feeds it is the shop's banners. It was the shopkeeper's categories for a while — the ones
 * they had given a shape to — and that arrangement could not point a poster at one product or out
 * of the shop, which is what brought the banner back as a row of its own.
 *
 * It stays generic on purpose — id, title, line, picture, shape, somewhere to go — so it never has
 * to know what kind of thing it is being handed.
 *
 * The text sits over the photograph, so the photograph gets a gradient under it rather than a flat
 * tint: an image whose bottom third is already dark would go black under a tint, and one that is
 * white there would swallow the name without one. The gradient is drawn in the shop's own text
 * colour, so a shop that dresses in cream is not handed a black card it never chose.
 *
 * Rows are grouped by layout and kept in the shopkeeper's order. Mixing a three-across and a
 * two-across card in one row would make the grid decide their sizes, and the size is the choice.
 */
export function StorefrontShowcase({
  items,
  linkComponent: Link = AnchorLink,
  renderItem,
}: StorefrontShowcaseProps) {
  if (!items.length) return null

  // Consecutive cards of the same shape become one row. A shopkeeper who alternates gets a row
  // each, which is what alternating asks for.
  const rows: { layout: StorefrontShowcaseLayout; items: StorefrontShowcaseItem[] }[] = []

  for (const item of items) {
    const last = rows.at(-1)

    if (last && last.layout === item.layout) last.items.push(item)
    else rows.push({ layout: item.layout, items: [item] })
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {rows.map((row, index) => (
        <ul key={`${row.layout}-${index}`} className={cn("grid gap-4", COLUMNS[row.layout])}>
          {row.items.map((item) => {
            const body = (
              <>
                <img
                  src={item.imageUrl}
                  // Decorative: the title is written over it and is the card's whole accessible
                  // name. Naming the artwork after the card says the same words twice.
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(to top, color-mix(in oklab, var(--shop-text) 88%, transparent) 0%, color-mix(in oklab, var(--shop-text) 45%, transparent) 38%, transparent 70%)",
                  }}
                />

                <div
                  className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5"
                  style={{ color: "var(--shop-background)" }}
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <p
                      className={cn(
                        "leading-tight font-semibold text-balance",
                        row.layout === "FULL" ? "text-2xl sm:text-4xl" : "text-lg",
                      )}
                    >
                      {item.title}
                    </p>
                    {item.subtitle ? (
                      <p
                        className={cn(
                          "line-clamp-2 opacity-85",
                          row.layout === "FULL" ? "max-w-xl text-sm sm:text-base" : "text-sm",
                        )}
                      >
                        {item.subtitle}
                      </p>
                    ) : null}
                  </div>

                  {item.href ? (
                    <span
                      aria-hidden="true"
                      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-current/40 transition-transform group-hover:translate-x-1"
                    >
                      <ArrowRightIcon className="size-5" />
                    </span>
                  ) : null}
                </div>
              </>
            )

            const shape = cn(
              "group relative block w-full overflow-hidden rounded-2xl",
              HEIGHT[row.layout],
            )

            const card = item.href ? (
              <Link
                href={item.href}
                className={shape}
                // The pair every outbound anchor in this repository carries. Without the
                // `target`, a banner pointing at WhatsApp takes the shop window away with it.
                {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {body}
              </Link>
            ) : (
              // No link, no arrow, and no element pretending to be interactive: a card the
              // shopkeeper gave nowhere to go is a poster.
              <div className={shape}>{body}</div>
            )

            return <li key={item.id}>{renderItem ? renderItem(item, card) : card}</li>
          })}
        </ul>
      ))}
    </div>
  )
}
