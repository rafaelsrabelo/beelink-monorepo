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
 * their session; every form posts to the shop's handler and comes back here with what came of it.
 */
export async function ReviewsTab({ slug, routes, query, locale, errors, messages }: ReviewsTabProps) {
  const text = messages.storefront
  const [pending, sent] = await Promise.all([pendingReviewsAt(slug), shopperReviewsAt(slug)])
  const back = routes.accountTab("reviews")

  if (!pending || !sent) return <StorefrontReviewsEmpty variant="unavailable" href={back} linkComponent={AppLink} messages={messages} />
  if (pending.length === 0 && sent.length === 0) return <StorefrontReviewsEmpty variant="none" href={routes.accountTab("orders")} linkComponent={AppLink} messages={messages} />

  const asked = paramOf(query[REVIEW_PRODUCT_KEY])
  const refused = paramOf(query[REVIEWS_ERROR_KEY])
  const outcome = paramOf(query.aviso)
  const action = reviewsActionOf(slug)
  const fields = (productId: string) => ({ produto: productId, retorno: back, entrada: routes.signIn() })

  return (
    <div className="flex flex-col gap-6">
      {refused ? (
        <StorefrontAccountOutcome tone="failed" message={errorSentenceOf(errors, refused)} />
      ) : outcome === REVIEW_SENT || outcome === REVIEW_SAVED ? (
        <StorefrontAccountOutcome tone="done" message={outcome === REVIEW_SENT ? text.reviewSent : text.reviewSaved} />
      ) : null}

      <StorefrontReviewsSection title={text.reviewsPendingTitle} hint={pending.length > 0 ? text.reviewsPendingHint : text.reviewsNothingPending}>
        {pending.map((line) => (
          <StorefrontReviewCard
            key={line.productId}
            id={reviewAnchorOf(line.productId)}
            name={line.name}
            href={routes.product(line.slug)}
            imageUrl={line.imageUrl}
            meta={[format(text.reviewDeliveredOn, { date: likedOnOf(line.deliveredAt, locale) }), line.variantLabel].filter(Boolean).join(" · ")}
            form={<StorefrontReviewForm action={action} hidden={{ acao: "criar", ...fields(line.productId) }} idPrefix={line.productId} submitLabel={text.reviewSend} messages={messages} />}
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
              href={routes.product(review.slug)}
              imageUrl={review.imageUrl}
              meta={review.variantLabel}
              rating={review.rating}
              comment={review.comment}
              hidden={review.hidden}
              open={asked === review.productId}
              form={
                <StorefrontReviewForm
                  action={action}
                  hidden={{ acao: "editar", avaliacao: review.id, ...fields(review.productId) }}
                  idPrefix={review.id}
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
