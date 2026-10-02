// React
import { useId } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** The notices a shopper takes by e-mail, as the form draws and posts them. */
export interface StorefrontNotices {
  orders: boolean
  favorites: boolean
  cashback: boolean
  offers: boolean
}

export interface StorefrontAccountNoticesProps {
  /** Where the notices go. */
  email: string
  notices: StorefrontNotices
  /** When the shopper said yes to offers, already in their words; null when they have not. */
  offersSince?: string | null
  /** Where the form posts: the web's route handler. */
  action: string
  /** Carried through the post: this page, to come back to. */
  hidden?: Readonly<Record<string, string>>
  /** What the last save came back with, already a sentence. */
  notice?: string | null
  /** A refusal, already a sentence. */
  error?: string | null
  messages?: UiMessages
}

/**
 * Which e-mails a shopper takes from the shop (BEELINK-151), as 6h draws its notices: their orders'
 * progress, their favourites, their cashback about to expire (BEELINK-241), the shop's offers. One
 * plain form of boxes to tick, saved all at once — a box left unticked is a no.
 */
export function StorefrontAccountNotices({
  email,
  notices,
  offersSince = null,
  action,
  hidden = {},
  notice,
  error,
  messages = defaultMessages,
}: StorefrontAccountNoticesProps) {
  const text = messages.storefront
  const headingId = useId()
  const options: { name: keyof StorefrontNotices; label: string; hint: string }[] = [
    { name: "orders", label: text.noticesOrders, hint: text.noticesOrdersHint },
    { name: "favorites", label: text.noticesFavorites, hint: text.noticesFavoritesHint },
    { name: "cashback", label: text.noticesCashback, hint: text.noticesCashbackHint },
    { name: "offers", label: text.noticesOffers, hint: text.noticesOffersHint },
  ]

  return (
    <section
      id="avisos"
      aria-labelledby={headingId}
      className="flex w-full max-w-3xl scroll-mt-[calc(var(--shop-masthead-height,160px)+16px)] flex-col gap-4 rounded-xl border border-shop-line bg-shop-background p-6 text-shop-on-background"
    >
      <h2 id={headingId} className="text-base font-bold">
        {text.noticesTitle}
      </h2>

      {error ? (
        <p role="alert" className="rounded-[10px] border border-shop-sale-ink/30 px-4 py-3 text-sm text-shop-sale-ink">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-[10px] border border-shop-line bg-shop-fill px-4 py-3 text-sm">
          {notice}
        </p>
      ) : null}

      <form action={action} method="post" className="flex flex-col gap-4">
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {/* The box left unticked sends nothing, as a form drawn before it existed does: this says it was there. */}
        <input type="hidden" name="offered" value="cashback" />
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm text-shop-muted">{format(text.noticesLead, { email })}</legend>
          {options.map((option) => {
            const id = `${headingId}-${option.name}`
            // The whole card ticks the box; the title alone names it, the rest describes it.
            return (
              <label key={option.name} htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-shop-line px-3 py-2.5 has-checked:border-shop-primary">
                <input
                  id={id}
                  type="checkbox"
                  name={option.name}
                  value="1"
                  defaultChecked={notices[option.name]}
                  aria-labelledby={`${id}-label`}
                  aria-describedby={`${id}-hint`}
                  className="mt-1 size-4 shrink-0 accent-shop-primary"
                />
                <span className="flex flex-col gap-0.5">
                  <span id={`${id}-label`} className="text-sm font-semibold">
                    {option.label}
                  </span>
                  <span id={`${id}-hint`} className="text-xs text-shop-muted">
                    {option.hint}
                    {option.name === "offers" && notices.offers && offersSince ? ` ${format(text.noticesOffersSince, { date: offersSince })}` : null}
                  </span>
                </span>
              </label>
            )
          })}
        </fieldset>
        <button type="submit" className="h-12 self-start rounded-xl bg-shop-primary px-6 text-base font-semibold text-shop-on-primary transition-opacity hover:opacity-90">
          {text.noticesSave}
        </button>
      </form>
    </section>
  )
}
