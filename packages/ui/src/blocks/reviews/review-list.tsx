// Libs
import { EyeIcon, EyeOffIcon, StarIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface ReviewListRow {
  id: string
  rating: number
  comment: string | null
  productName: string
  /** The list narrowed to this product. */
  productHref: string
  customerName: string
  /** Already in the owner's words. */
  date: string
  hidden: boolean
}

export interface ReviewListProps {
  rows: readonly ReviewListRow[]
  /** Why there are none: the shop has none yet, or none under the filters chosen. */
  empty: "none" | "filtered"
  /** The review whose hide or publish is on its way: its button waits. */
  busyId?: string | null
  onToggle: (row: ReviewListRow) => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The panel's reviews (J19): each with its stars, the words, who and when, the product — whose name
 * narrows the list to it — and the one thing the owner may do, hide it or publish it again.
 */
export function ReviewList({ rows, empty, busyId = null, onToggle, linkComponent: Link = AnchorLink, messages = defaultMessages }: ReviewListProps) {
  const text = messages.reviews

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 px-4 py-12 text-center">
        <p className="text-sm font-medium">{empty === "none" ? text.empty : text.emptyFiltered}</p>
        {empty === "none" ? <p className="text-muted-foreground text-sm">{text.emptyHint}</p> : null}
      </div>
    )
  }

  return (
    <ul className="divide-y">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-foreground flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon key={star} aria-hidden="true" className="size-4" fill={star <= row.rating ? "currentColor" : "none"} strokeWidth={1.4} />
                ))}
                <span className="sr-only">{format(text.ratedLabel, { rating: String(row.rating) })}</span>
              </p>
              {row.hidden ? <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">{text.hidden}</span> : null}
            </div>
            <p className={row.comment ? "text-sm whitespace-pre-line" : "text-muted-foreground text-sm italic"}>{row.comment ?? text.noComment}</p>
            <p className="text-muted-foreground text-xs">
              {format(text.byOn, { name: row.customerName, date: row.date })} ·{" "}
              <Link href={row.productHref} className="text-foreground font-medium hover:underline">
                {row.productName}
              </Link>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggle(row)}
            disabled={busyId === row.id}
            aria-label={format(row.hidden ? text.publishLabel : text.hideLabel, { name: row.customerName })}
            className="hover:bg-muted inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-md border px-3 text-sm font-medium disabled:cursor-default disabled:opacity-60"
          >
            {row.hidden ? <EyeIcon aria-hidden="true" className="size-4" /> : <EyeOffIcon aria-hidden="true" className="size-4" />}
            {row.hidden ? text.publish : text.hide}
          </button>
        </li>
      ))}
    </ul>
  )
}
