// React
import type { ReactNode } from "react"

// Libs
import { EyeOffIcon, StarIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontReviewCardProps {
  /** The anchor a delivered order's "Avaliar produto" leads to. */
  id: string
  name: string
  /** The product's page; null once it is off sale. */
  href: string | null
  imageUrl: string | null
  /** "Entregue em 12 set · Sabor: Uva", or "Sabor: Uva" once rated — already in words. */
  meta: string | null
  /** The rating given, drawn and read; null for one still to rate. */
  rating?: number | null
  comment?: string | null
  /** The shop took it off the shop window: the shopper still sees it, and is told. */
  hidden?: boolean
  /** The form: open for one to rate; behind "Editar avaliação" for one sent, unless `open`. */
  form: ReactNode
  /** The edit starts open — the one a delivered order led to. */
  open?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** Five stars in the rating colour, read as one sentence. */
function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <p className="flex items-center gap-0.5 text-shop-primary-ink">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon key={star} aria-hidden="true" className="size-4" fill={star <= rating ? "currentColor" : "none"} strokeWidth={1.4} />
      ))}
      <span className="sr-only">{label}</span>
    </p>
  )
}

/**
 * One product of Avaliar compras (6c): what arrived, with the stars and the box right there — or
 * the review already sent, its stars and words, and the same form to edit it behind "Editar".
 */
export function StorefrontReviewCard({ id, name, href, imageUrl, meta, rating, comment, hidden = false, form, open = false, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontReviewCardProps) {
  const text = messages.storefront
  const sent = rating !== undefined && rating !== null

  return (
    <article id={id} className="flex scroll-mt-24 gap-4 rounded-2xl border border-shop-line bg-shop-background p-4">
      <span className="size-[72px] shrink-0 overflow-hidden rounded-[10px] bg-shop-placeholder">
        {/* Decorative: the name beside it says what it is. */}
        {imageUrl ? <img src={imageUrl} alt="" loading="lazy" className="size-full object-cover" /> : null}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[15px] font-semibold">{href ? <Link href={href}>{name}</Link> : name}</h3>
          {meta ? <p className="text-xs text-shop-muted">{meta}</p> : null}
        </div>

        {sent ? (
          <>
            <Stars rating={rating} label={format(text.reviewRatedLabel, { rating: String(rating) })} />
            {comment ? <p className="text-sm whitespace-pre-line">{comment}</p> : null}
            {hidden ? (
              <p className="flex items-center gap-1.5 text-xs text-shop-muted">
                <EyeOffIcon aria-hidden="true" className="size-3.5" />
                {text.reviewHiddenByShop}
              </p>
            ) : null}
            <details open={open} className="group">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-shop-primary-ink">{text.reviewEdit}</summary>
              <div className="pt-2">{form}</div>
            </details>
          </>
        ) : (
          form
        )}
      </div>
    </article>
  )
}
