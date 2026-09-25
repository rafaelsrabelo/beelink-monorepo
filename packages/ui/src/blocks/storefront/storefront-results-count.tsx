// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontResultsCountProps {
  /** The page on screen, as the API answered it. */
  page: number
  pageSize: number
  /** Every product the filters matched, as the API counts them — never the length of one page. */
  total: number
  /** What was searched for, said back in the promotion colour. */
  term?: string
  locale: string
  messages?: UiMessages
}

/** The first and last position on this page, in the whole list: page 2 of 16 is 17–32. */
export function rangeOf(page: number, pageSize: number, total: number): { from: number; to: number } {
  const from = Math.min((Math.max(page, 1) - 1) * pageSize + 1, total)
  return { from, to: Math.min(Math.max(page, 1) * pageSize, total) }
}

/**
 * The count beside a listing's title, as 5a writes it: "1–16 de 86 resultados para "pré-treino"",
 * the term bold, in straight quotes, in the promotion colour.
 */
export function StorefrontResultsCount({ page, pageSize, total, term, locale, messages = defaultMessages }: StorefrontResultsCountProps) {
  const text = messages.storefront
  const number = new Intl.NumberFormat(locale)
  const { from, to } = rangeOf(page, pageSize, total)
  const count =
    total === 0
      ? text.resultsNone
      : total === 1
        ? text.resultsOne
        : format(text.resultsRange, { from: number.format(from), to: number.format(to), total: number.format(total) })

  return (
    <p className="text-sm text-shop-muted">
      {count}
      {term ? (
        <>
          {` ${text.resultsFor} `}
          <b className="text-shop-sale-ink">&quot;{term}&quot;</b>
        </>
      ) : null}
    </p>
  )
}
