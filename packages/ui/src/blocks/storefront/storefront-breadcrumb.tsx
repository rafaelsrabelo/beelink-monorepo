// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontCrumb {
  label: string
  /** Absent on the last one: the page you are standing on is not a link to itself. */
  href?: string
}

export interface StorefrontBreadcrumbProps {
  /** Without the home, which this block puts in front on its own. */
  items: readonly StorefrontCrumb[]
  homeHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * Where you are, counted from the shop's front door.
 *
 * It answers a question the back button cannot: someone who arrived on a product page from Google
 * or from a WhatsApp link has no history to go back through, and the trail is the only thing on
 * the page that says the product sits inside a category which sits inside a shop. That is most of
 * what it is for — not the going back, but the knowing where.
 *
 * An ordered list, because the order is the meaning, and the last crumb is text rather than a link
 * to the page it is already on. The separators are `aria-hidden`: a reader announcing "greater
 * than" between every step is reading the furniture.
 *
 * Drawn as 5a and 5b draw it: 13px, a `›` between steps, the links in the brand's link colour and
 * the rest in the muted ink. No spacing of its own — the listing's results band and the product
 * page each put it where the design puts it.
 */
export function StorefrontBreadcrumb({
  items,
  homeHref,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontBreadcrumbProps) {
  const text = messages.storefront

  if (!items.length) return null

  const trail: StorefrontCrumb[] = [{ label: text.breadcrumbHome, href: homeHref }, ...items]

  return (
    <nav aria-label={text.breadcrumbLabel}>
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-shop-muted">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1

          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden="true">›</span> : null}

              {crumb.href && !last ? (
                <Link
                  href={crumb.href}
                  className="text-shop-primary-ink transition-colors hover:[color:color-mix(in_oklab,var(--shop-primary-ink)_75%,var(--shop-on-background))]"
                >
                  {crumb.label}
                </Link>
              ) : (
                // The page you are on, named but not linked, and marked so a reader knows which of
                // the row is the one you are standing in.
                <span aria-current={last ? "page" : undefined}>{crumb.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
