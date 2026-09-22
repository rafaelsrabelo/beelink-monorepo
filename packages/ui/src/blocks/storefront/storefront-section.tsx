// React
import type { ReactNode } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

/**
 * Never 1. The page has already spent its `<h1>` on what the page *is* — the shop's name on the
 * home, the catalogue's title on the catalogue — and a band is a part of that page, not a second
 * one competing with it.
 */
export type StorefrontSectionHeadingLevel = 2 | 3 | 4 | 5 | 6

export interface StorefrontSectionProps {
  /** The band's heading, and the `{section}` its "see all" link names itself after. */
  title: string
  /**
   * The small line above the heading. Decorative in the accessibility tree on purpose: it is a
   * flourish over the title, and read out it arrives as a fragment before the words that matter.
   */
  label?: string
  description?: string
  /** Where the band's real page lives. Without one there is no link: there is nowhere to send them. */
  moreHref?: string
  /** Replaces the visible "see all" only; the accessible name stays the one built from `title`. */
  moreLabel?: string
  /**
   * The page's decision, never the band's. Three `<h1>` on one home is a broken outline that axe
   * cannot see — every heading is valid on its own and only the sequence is wrong — so the level
   * has to arrive from whoever knows what sits above the band.
   */
  headingLevel?: StorefrontSectionHeadingLevel
  children: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * One titled band of a landing page: a heading, a line under it, and the way into the page that
 * holds the rest of it.
 *
 * The band names itself for the accessibility tree, which is the whole of what turns a `<section>`
 * into a landmark — an unnamed one is announced as nothing and cannot be jumped to, so a home of
 * three anonymous bands is one long page with no way to skip down it.
 *
 * The heading never changes size with its level. The level says where the band sits in the page's
 * outline and the size says how loud it looks; tying the two together would price a correct
 * outline at a redesign, and the outline is the part a screen reader actually navigates by.
 *
 * "See all" is the same two words in every band, so the link carries `seeAllOf` — "Ver tudo em
 * Destaques" — as its accessible name. A reader listing the links of a home otherwise hears
 * "Ver todos" three times with nothing to tell them apart (WCAG 2.4.4).
 *
 * What runs inside is the caller's: a rail, a grid, a row of categories. A band with nothing in it
 * is a title promising something that is not there, so the caller drops the band, not the heading.
 */
export function StorefrontSection({
  title,
  label,
  description,
  moreHref,
  moreLabel,
  headingLevel = 2,
  children,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontSectionProps) {
  const text = messages.storefront
  const Heading = `h${headingLevel}` as `h${StorefrontSectionHeadingLevel}`

  return (
    <section aria-label={title} className="flex w-full flex-col gap-4">
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
          <Heading className="text-lg font-semibold">{title}</Heading>
          {description ? <p className="max-w-prose text-sm opacity-70">{description}</p> : null}
        </div>

        {moreHref ? (
          <Link
            href={moreHref}
            aria-label={format(text.seeAllOf, { section: title })}
            className="shrink-0 text-sm font-medium underline-offset-4 hover:underline"
            style={{ color: "var(--shop-primary-ink)" }}
          >
            {moreLabel ?? text.seeAll}
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  )
}
