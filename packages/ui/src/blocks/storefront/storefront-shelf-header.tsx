// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontShelfHeaderProps {
  /** The shelf's title, and the name its "see all" link is announced by. */
  title: string
  /** The small line above the title. `aria-hidden`, for the reason StorefrontSection's is. */
  label?: string
  /** Where the rest of the shelf lives. Without it the header offers no way through. */
  seeAllHref?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The heading over a shelf of products — the rail's and the grid's alike, so a showcase switched
 * from one to the other keeps its title where it was.
 */
export function StorefrontShelfHeader({
  title,
  label,
  seeAllHref,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontShelfHeaderProps) {
  const text = messages.storefront

  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="flex flex-col gap-1">
        {label ? (
          <p
            aria-hidden="true"
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "var(--shop-primary-ink)" }}
          >
            {label}
          </p>
        ) : null}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      {seeAllHref ? (
        <Link
          href={seeAllHref}
          // "Ver todos" three times over is three identical names in a screen reader's list of
          // links, and no way to tell which goes where (WCAG 2.4.4). The eye keeps the short one.
          aria-label={text.seeAllOf.replace("{section}", title)}
          className="shrink-0 text-sm font-medium underline-offset-4 hover:underline"
          style={{ color: "var(--shop-primary-ink)" }}
        >
          {text.seeAll}
        </Link>
      ) : null}
    </div>
  )
}
