// Libs
import { ArrowRightIcon } from "lucide-react"

// Locales
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { StorefrontSpan } from "./storefront-band-cell"
import { SPAN_HEIGHT, SPAN_TITLE } from "./storefront-span-shape"

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
}

export interface StorefrontShowcaseProps {
  items: readonly StorefrontShowcaseItem[]
  /**
   * The slice of the band the block sits in. It sets the picture's proportion and the size of the
   * words; the width itself is the cell's, which is why this block only ever fills what it is given.
   */
  span: StorefrontSpan
  linkComponent?: LinkComponent
}

/**
 * A banner shown as a grid: one column per picture, from a cell of 448px for two, 768px for three
 * and 1024px for four. Narrower than that the pictures stack, which is what a phone gets — and a
 * third of a band, where three pictures side by side would each be too small to read.
 */
const COLUMNS_OF_COUNT: Record<2 | 3 | 4, string> = {
  2: "@md:grid-cols-2",
  3: "@md:grid-cols-2 @3xl:grid-cols-3",
  4: "@md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4",
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
 * It no longer arranges posters into rows. It used to, grouping neighbours of one shape, because the
 * band was a column and this was the only place two posters could share a row. The band is a grid
 * now, and each banner is its own cell there.
 *
 * Several items are one banner shown as a grid: its pictures side by side inside its own cell.
 * The columns follow the cell and not the screen — three pictures in a third of a wide band are
 * three stamps, and a container query is what knows the cell is narrow.
 */
export function StorefrontShowcase({ items, span, linkComponent: Link = AnchorLink }: StorefrontShowcaseProps) {
  if (!items.length) return null

  const grid = items.length > 1

  return (
    <div className="@container w-full">
      <ul className={cn("grid w-full gap-4", grid && COLUMNS_OF_COUNT[Math.min(items.length, 4) as 2 | 3 | 4])}>
        {items.map((item) => {
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
                style={{ color: "var(--shop-on-text)" }}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p
                    className={cn(
                      "leading-tight font-semibold text-balance",
                      grid ? SPAN_TITLE.THIRD : SPAN_TITLE[span],
                    )}
                  >
                    {item.title}
                  </p>
                  {item.subtitle ? (
                    <p
                      className={cn(
                        "line-clamp-2 opacity-85",
                        span === "FULL" ? "max-w-xl text-sm sm:text-base" : "text-sm",
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

          // A card sharing the cell is a fraction of it, whatever the cell's own width: a small card's 4:3.
          const shape = cn(
            "group relative block w-full overflow-hidden rounded-2xl",
            grid ? "aspect-[4/3]" : SPAN_HEIGHT[span],
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

          return <li key={item.id}>{card}</li>
        })}
      </ul>
    </div>
  )
}
