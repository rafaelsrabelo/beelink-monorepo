// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontProductCard, type StorefrontProduct } from "./storefront-product-card"

export interface StorefrontProductRailProps {
  products: readonly StorefrontProduct[]
  /** Built by the screen: a block never knows that a product lives under `/<shop>/<word>/<slug>`. */
  productHref: (productSlug: string) => string
  locale: string
  /** The band's title, and the name the scrollable region answers to. Defaults to "Destaques". */
  title?: string
  /** The small line above the title. `aria-hidden`, for the reason StorefrontSection's is. */
  label?: string
  /** The catalogue. Without it the band is a selection with no way through to the rest. */
  seeAllHref?: string
  showPrice?: boolean
  showBadge?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * How wide a card is on the rail, and nothing else decides it.
 *
 * In the grid the column sets the width; on a rail nothing does, so a fluid card is a card whose
 * width is an accident of the viewport — which is how a phone ends up showing one card and a
 * sliver of the next. Fixed per breakpoint: two and a peek on a phone, three on a tablet, four and
 * a peek on a wide screen — four across is what the shop owner's reference design shows, and the
 * peek is deliberate. With no arrows, a card cut by the edge is the whole affordance: it is what
 * says the row keeps going.
 */
const CARD_WIDTH = "w-44 sm:w-52 lg:w-64"

/**
 * The home's band of products, running sideways.
 *
 * The home is a landing and not the catalogue, so it shows one titled band and a door into the
 * whole shop — which is what the shop owner asked for, pointing at the shops he buys from.
 *
 * A scroll container, never a carousel. A carousel is state: a slide index, arrows that do nothing
 * until JavaScript arrives, cards held out of the document until their turn. Here the browser
 * scrolls and snaps by itself, so the band works on first paint with scripting off and every card
 * is in the HTML for a crawler to follow. The scrollbar itself is hidden — the shop owner asked,
 * and the card cut by the right edge is what says the row keeps going, which is why the card has
 * a fixed width at every breakpoint rather than a fluid one.
 */
export function StorefrontProductRail({
  products,
  productHref,
  locale,
  title,
  label,
  seeAllHref,
  showPrice = true,
  showBadge = true,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontProductRailProps) {
  const text = messages.storefront
  const heading = title ?? text.featuredHeading

  // Nothing to run sideways: the screen decides whether that is an empty shop, a filter that
  // matched nothing, or a home that simply drops the band — a block cannot tell those apart.
  if (!products.length) return null

  return (
    <section className="flex w-full flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex flex-col gap-1">
          {label ? (
            <p
              aria-hidden="true"
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: "var(--shop-primary)" }}
            >
              {label}
            </p>
          ) : null}
          <h2 className="text-lg font-semibold">{heading}</h2>
        </div>

        {seeAllHref ? (
          <Link
            href={seeAllHref}
            // "Ver todos" three times over is three identical names in a screen reader's list of
            // links, and no way to tell which goes where (WCAG 2.4.4). The eye keeps the short one.
            aria-label={text.seeAllOf.replace("{section}", heading)}
            className="shrink-0 text-sm font-medium underline-offset-4 hover:underline"
            style={{ color: "var(--shop-primary)" }}
          >
            {text.seeAll}
          </Link>
        ) : null}
      </div>

      {/*
        `tabindex={0}` and a named `role="group"`: a region that scrolls sideways cannot be reached
        by a keyboard unless it can hold focus, because the arrow keys scroll whatever is focused
        and a div is nothing. The links inside only hide it — the day a card carries no link (a
        rail of photographs, a shop with its prices off) the region is unreachable outright. That
        is WCAG 2.1.1, and axe does not catch it here: jsdom lays nothing out, so nothing measures
        as scrollable and the rule never fires. The name is the band's own title, since "group" on
        its own tells a visitor nothing about what they just landed in.

        The negative margin is the fix for the last card: a rail inside a centred container ends at
        the container's padding, so the final card sits jammed against the text edge. The band
        bleeds a gutter wider than the page and pays it back as padding on the track itself — not
        on the scroller, where an end padding is the one browsers have historically dropped — so
        the first card still lines up under the heading and the last one ends with air after it.
      */}
      <div
        tabIndex={0}
        role="group"
        aria-label={heading}
        className="no-scrollbar -mx-4 overflow-x-auto overscroll-x-contain scroll-px-4 snap-x snap-mandatory focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ outlineColor: "var(--shop-primary)" }}
      >
        <ul className="flex gap-3 px-4">
          {products.map((product) => (
            <li key={product.id} className={cn("shrink-0 snap-start", CARD_WIDTH)}>
              <StorefrontProductCard
                product={product}
                href={productHref(product.slug)}
                locale={locale}
                showPrice={showPrice}
                showBadge={showBadge}
                linkComponent={Link}
                messages={messages}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
