// Libs
import { StarIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontQuickRatingProps {
  /** Where it posts: the shop's handler, which answers with a 303 back to the page. */
  action: string
  /** Carried along: what to do, which product, where to come back. */
  hidden: Readonly<Record<string, string>>
  /** Names the group: a reader moving from one card's stars to the next hears which product. */
  productName: string
  messages?: UiMessages
}

const RATINGS = [1, 2, 3, 4, 5] as const

/**
 * The stars of the account's front (6c): one tap sends the rating, with no words — those are
 * written on the tab. Five submit buttons, each carrying its own `nota`, so it posts with no script.
 * A star lights while it, or one after it, is under the pointer or the keyboard's focus — CSS alone.
 */
export function StorefrontQuickRating({ action, hidden, productName, messages = defaultMessages }: StorefrontQuickRatingProps) {
  const text = messages.storefront

  return (
    <form method="post" action={action}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div role="group" aria-label={format(text.quickRatingGroup, { name: productName })} className="flex w-fit gap-0.5">
        {RATINGS.map((value) => (
          <button
            key={value}
            type="submit"
            name="nota"
            value={value}
            // Muted, not a line colour: an empty star is an option to see, at 3:1 or more.
            className="flex size-11 cursor-pointer items-center justify-center rounded-full text-shop-muted hover:text-shop-primary-ink focus-visible:text-shop-primary-ink focus-visible:outline-2 focus-visible:outline-shop-primary-ink [&:has(~button:focus-visible)]:text-shop-primary-ink [&:has(~button:hover)]:text-shop-primary-ink"
          >
            <StarIcon aria-hidden="true" className="size-6" fill="currentColor" strokeWidth={1.2} />
            <span className="sr-only">{value === 1 ? text.reviewStarOne : format(text.reviewStarMany, { count: String(value) })}</span>
          </button>
        ))}
      </div>
    </form>
  )
}
