// React
import { Fragment } from "react"

// Libs
import { StarIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontReviewFormProps {
  /** Where it posts: the shop's handler, which answers with a 303 back to the tab. */
  action: string
  /** Carried along: what to do, which product or review, where to come back. */
  hidden: Readonly<Record<string, string>>
  /** Names the stars' radios and the comment's box, so two forms on one page never share a field. */
  idPrefix: string
  /** The rating and the words already given, when editing. */
  rating?: number | null
  comment?: string | null
  /** "Enviar avaliação" for a new one, "Salvar avaliação" for an edit. */
  submitLabel: string
  messages?: UiMessages
}

const RATINGS = [1, 2, 3, 4, 5] as const

/**
 * A rating and a few words, as 6c asks them: five stars and a box, posted as a plain form — no
 * script, and the address says what came of it.
 *
 * The stars are five radios, 1 to 5 in the markup as on screen, so the arrow keys move the way the
 * eye reads. A star is filled when the radio checked comes after it, or is its own — CSS alone, no
 * script. A reader hears a group of radios named "3 estrelas".
 */
export function StorefrontReviewForm({ action, hidden, idPrefix, rating, comment, submitLabel, messages = defaultMessages }: StorefrontReviewFormProps) {
  const text = messages.storefront

  return (
    <form method="post" action={action} className="flex flex-col gap-3">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-semibold">{text.reviewRatingLegend}</legend>
        <div className="flex w-fit gap-1 rounded-lg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-shop-primary-ink">
          {RATINGS.map((value) => {
            const id = `${idPrefix}-nota-${value}`
            return (
              // Siblings, not wrapped: a star reads the radios after it in the markup.
              <Fragment key={value}>
                <input type="radio" id={id} name="nota" value={value} required defaultChecked={rating === value} className="sr-only" />
                <label
                  htmlFor={id}
                  className="flex size-11 cursor-pointer items-center justify-center text-shop-line-strong [&:has(~input:checked)]:text-shop-primary-ink [input:checked+&]:text-shop-primary-ink"
                >
                  <StarIcon aria-hidden="true" className="size-7" fill="currentColor" strokeWidth={1.2} />
                  <span className="sr-only">{value === 1 ? text.reviewStarOne : format(text.reviewStarMany, { count: String(value) })}</span>
                </label>
              </Fragment>
            )
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        {text.reviewCommentLabel}
        <textarea
          name="comentario"
          defaultValue={comment ?? ""}
          maxLength={1000}
          rows={3}
          placeholder={text.reviewCommentPlaceholder}
          className="rounded-[10px] border border-shop-line-strong bg-shop-background px-3 py-2 text-sm font-normal text-shop-on-background"
        />
      </label>

      <button type="submit" className="h-11 w-fit cursor-pointer rounded-full bg-shop-primary px-5 text-sm font-semibold text-shop-on-primary">
        {submitLabel}
      </button>
    </form>
  )
}
