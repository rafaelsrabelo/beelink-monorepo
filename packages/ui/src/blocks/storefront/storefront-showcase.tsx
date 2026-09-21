// Libs
import { ArrowRightIcon } from "lucide-react"

// Locales
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export type StorefrontShowcaseLayout = "THIRDS" | "HALVES"

export interface StorefrontShowcaseItem {
  id: string
  title: string
  subtitle?: string | null
  imageUrl: string
  /** Null makes the card a picture rather than a promise, and no arrow is drawn. */
  href?: string | null
  layout: StorefrontShowcaseLayout
}

export interface StorefrontShowcaseProps {
  items: readonly StorefrontShowcaseItem[]
  linkComponent?: LinkComponent
}

/**
 * Three across for a card carrying a name and a line; two across for artwork with room to breathe.
 * Both collapse to one on a phone: half of a card this dark is unreadable, not half as useful.
 */
const COLUMNS: Record<StorefrontShowcaseLayout, string> = {
  THIRDS: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  HALVES: "grid-cols-1 lg:grid-cols-2",
}

const HEIGHT: Record<StorefrontShowcaseLayout, string> = {
  THIRDS: "aspect-[4/3]",
  HALVES: "aspect-[16/9]",
}

/**
 * The shopkeeper's own blocks on their landing page: a picture, a name, a line and a way in.
 *
 * Nothing here is derived from a product. The shop owner asked to *write* these — "Creatina
 * Ultramesh / MESH 500" over artwork they made — and a card that read a product's fields would be
 * edited by a price change and emptied by a sold-out item. What it links to is a separate question
 * the shopkeeper answers, which is why `href` is its own field and may be null.
 *
 * The text sits over the photograph, so the photograph gets a gradient under it rather than a flat
 * tint: an image whose bottom third is already dark would go black under a tint, and one that is
 * white there would swallow the name without one. The gradient is drawn in the shop's own text
 * colour, so a shop that dresses in cream is not handed a black card it never chose.
 *
 * Rows are grouped by layout and kept in the shopkeeper's order. Mixing a three-across and a
 * two-across card in one row would make the grid decide their sizes, and the size is the choice.
 */
export function StorefrontShowcase({ items, linkComponent: Link = AnchorLink }: StorefrontShowcaseProps) {
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
                    <p className="text-lg leading-tight font-semibold text-balance">{item.title}</p>
                    {item.subtitle ? (
                      <p className="line-clamp-2 text-sm opacity-85">{item.subtitle}</p>
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

            return (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className={shape}>
                    {body}
                  </Link>
                ) : (
                  // No link, no arrow, and no element pretending to be interactive: a card the
                  // shopkeeper gave nowhere to go is a poster.
                  <div className={shape}>{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      ))}
    </div>
  )
}
