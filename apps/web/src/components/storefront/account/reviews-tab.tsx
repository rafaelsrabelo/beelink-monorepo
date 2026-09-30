// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontAccountOutcome } from "@harness-monorepo/ui/blocks/storefront/storefront-account-outcome"
import { StorefrontReviewCard } from "@harness-monorepo/ui/blocks/storefront/storefront-review-card"
import { StorefrontReviewForm } from "@harness-monorepo/ui/blocks/storefront/storefront-review-form"
import { StorefrontReviewsEmpty } from "@harness-monorepo/ui/blocks/storefront/storefront-reviews-empty"
import { StorefrontReviewsSection } from "@harness-monorepo/ui/blocks/storefront/storefront-reviews-section"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { AppLink } from "@/components/app-link"
import { pendingReviewsAt, shopperReviewsAt } from "@/lib/customer-reviews"
import { errorSentenceOf } from "@/lib/error-sentence"
import { likedOnOf } from "@/lib/favorite-card-view"
import { REVIEW_PRODUCT_KEY, REVIEW_SAVED, REVIEW_SENT, REVIEWS_ERROR_KEY, reviewAnchorOf, reviewsActionOf } from "@/lib/review-view"
import { paramOf, type StorefrontRoutes } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"
import type { WebMessages } from "@/locales"

export interface ReviewsTabProps {
  slug: string
  routes: StorefrontRoutes
  query: SectionQuery
  locale: string
  errors: WebMessages["errors"]
  messages: UiMessages
}

/**
 * Avaliar compras (6c): what the shop delivered and the shopper has not rated, each with the stars
 * and the box right there, then the reviews they sent, each with its edit. Read on the server with
 * their session; every form posts to the shop's handler and comes back here, at its product's card,
 * which says what came of it — or over the tab, when that card is no longer here.
 */
export async function ReviewsTab({ slug, routes, query, locale, errors, messages }: ReviewsTabProps) {
  const text = messages.storefront
  const [pending, sent] = await Promise.all([pendingReviewsAt(slug), shopperReviewsAt(slug)])
  const back = routes.accountTab("reviews")

  const asked = paramOf(query[REVIEW_PRODUCT_KEY])
  const refused = paramOf(query[REVIEWS_ERROR_KEY])
  const went = paramOf(query.aviso)
  // A rejected field is the form's own mistake, said in the form's words.
  const outcome = refused ? (
    <StorefrontAccountOutcome tone="failed" message={refused === "BAD_REQUEST" ? text.reviewInvalid : errorSentenceOf(errors, refused)} />
  ) : went === REVIEW_SENT || went === REVIEW_SAVED ? (
    <StorefrontAccountOutcome tone="done" message={went === REVIEW_SENT ? text.reviewSent : text.reviewSaved} />
  ) : null
  const hasCard = asked !== undefined && [...(pending ?? []), ...(sent ?? [])].some((row) => row.productId === asked)
  const outcomeOf = (productId: string) => (hasCard && asked === productId ? outcome : null)
  const above = hasCard ? null : outcome

  if (!pending || !sent) return <StorefrontReviewsEmpty variant="unavailable" href={back} linkComponent={AppLink} messages={messages} />
  if (pending.length === 0 && sent.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {above}
        <StorefrontReviewsEmpty variant="none" href={routes.accountTab("orders")} linkComponent={AppLink} messages={messages} />
      </div>
    )
  }

  const action = reviewsActionOf(slug)
  const fields = (productId: string) => ({ produto: productId, retorno: back, entrada: routes.signIn() })

  return (
    <div className="flex flex-col gap-6">
      {above}

      <StorefrontReviewsSection title={text.reviewsPendingTitle} hint={pending.length > 0 ? text.reviewsPendingHint : text.reviewsNothingPending}>
        {pending.map((line) => (
          <StorefrontReviewCard
            key={line.productId}
            id={reviewAnchorOf(line.productId)}
            name={line.name}
            href={routes.product(line.slug)}
            imageUrl={line.imageUrl}
            meta={[format(text.reviewDeliveredOn, { date: likedOnOf(line.deliveredAt, locale) }), line.variantLabel].filter(Boolean).join(" · ")}
            outcome={outcomeOf(line.productId)}
            form={<StorefrontReviewForm action={action} hidden={{ acao: "criar", ...fields(line.productId) }} idPrefix={line.productId} productName={line.name} submitLabel={text.reviewSend} messages={messages} />}
            linkComponent={AppLink}
            messages={messages}
          />
        ))}
      </StorefrontReviewsSection>

      {sent.length > 0 ? (
        <StorefrontReviewsSection title={text.reviewsSentTitle}>
          {sent.map((review) => (
            <StorefrontReviewCard
              key={review.id}
              id={reviewAnchorOf(review.productId)}
              name={review.name}
              href={review.slug ? routes.product(review.slug) : null}
              imageUrl={review.imageUrl}
              meta={review.variantLabel}
              rating={review.rating}
              comment={review.comment}
              hidden={review.hidden}
              // The one an order led to opens, and stays open when its save was refused; a save that went closes it.
              open={asked === review.productId && !went}
              outcome={outcomeOf(review.productId)}
              form={
                <StorefrontReviewForm
                  action={action}
                  hidden={{ acao: "editar", avaliacao: review.id, ...fields(review.productId) }}
                  idPrefix={review.id}
                  productName={review.name}
                  rating={review.rating}
                  comment={review.comment}
                  submitLabel={text.reviewSave}
                  messages={messages}
                />
              }
              linkComponent={AppLink}
              messages={messages}
            />
          ))}
        </StorefrontReviewsSection>
      ) : null}
    </div>
  )
}
