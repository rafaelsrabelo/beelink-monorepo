// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import type { WebMessages } from "@/locales"

// UI
import { StorefrontAccountOutcome } from "@harness-monorepo/ui/blocks/storefront/storefront-account-outcome"
import { StorefrontQuickRating } from "@harness-monorepo/ui/blocks/storefront/storefront-quick-rating"
import { StorefrontReviewCard } from "@harness-monorepo/ui/blocks/storefront/storefront-review-card"
import { StorefrontReviewsSection } from "@harness-monorepo/ui/blocks/storefront/storefront-reviews-section"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { AppLink } from "@/components/app-link"
import { pendingReviewsAt } from "@/lib/customer-reviews"
import { errorSentenceOf } from "@/lib/error-sentence"
import { likedOnOf } from "@/lib/favorite-card-view"
import { quickReviewsOf } from "@/lib/overview-parts"
import { REVIEW_PRODUCT_KEY, REVIEW_SENT, REVIEWS_ERROR_KEY, reviewAnchorOf, reviewHrefOf, reviewsActionOf } from "@/lib/review-view"
import { paramOf, type StorefrontRoutes } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"

export interface AccountQuickReviewsProps {
  slug: string
  routes: StorefrontRoutes
  query: SectionQuery
  locale: string
  errors: WebMessages["errors"]
  messages: UiMessages
}

/**
 * "Avalie suas compras" on the account's front (6c): the first few delivered products with no
 * rating, each with stars that send it in one tap and come back here. A rating sent is said at the
 * top, at the place the page lands, with the way to add words on the tab; a refusal in its card.
 * Nothing to rate, or a read that failed, draws nothing: the front is whole without it.
 */
export async function AccountQuickReviews({ slug, routes, query, locale, errors, messages }: AccountQuickReviewsProps) {
  const pending = await pendingReviewsAt(slug)
  if (!pending) return null

  const text = messages.storefront
  const asked = paramOf(query[REVIEW_PRODUCT_KEY])
  const refused = paramOf(query[REVIEWS_ERROR_KEY])
  const sent = asked !== undefined && paramOf(query.aviso) === REVIEW_SENT
  const shown = quickReviewsOf(pending, asked)
  const failure = refused ? <StorefrontAccountOutcome tone="failed" message={refused === "BAD_REQUEST" ? text.reviewInvalid : errorSentenceOf(errors, refused)} /> : null
  const inCard = failure !== null && shown.some((line) => line.productId === asked)

  if (shown.length === 0 && !sent && !failure) return null

  const action = reviewsActionOf(slug)
  const back = routes.account()

  return (
    <StorefrontReviewsSection
      title={text.overviewReviewsTitle}
      hint={shown.length > 0 ? text.reviewsPendingHint : undefined}
      aside={
        pending.length > shown.length ? (
          <AppLink href={routes.accountTab("reviews")} className="py-2 text-sm font-semibold text-shop-primary-ink hover:underline">
            {format(text.overviewSeeAll, { count: String(pending.length) })}
          </AppLink>
        ) : null
      }
    >
      {sent ? (
        // Where the post lands (`#avaliar-<id>`): the product's card is gone, its rating sent.
        <div id={reviewAnchorOf(asked)} className="flex scroll-mt-24 flex-col items-start gap-1">
          <StorefrontAccountOutcome tone="done" message={text.reviewSent} />
          <AppLink href={reviewHrefOf(routes, asked)} className="py-2 text-sm font-semibold text-shop-primary-ink hover:underline">
            {text.overviewReviewComment}
          </AppLink>
        </div>
      ) : null}
      {failure && !inCard ? <div id={asked ? reviewAnchorOf(asked) : undefined} className="scroll-mt-24">{failure}</div> : null}
      {shown.length > 0 ? (
        <div className="grid gap-3 shop-md:grid-cols-2">
          {shown.map((line) => (
            <StorefrontReviewCard
              key={line.productId}
              id={reviewAnchorOf(line.productId)}
              name={line.name}
              href={routes.product(line.slug)}
              imageUrl={line.imageUrl}
              meta={[format(text.reviewDeliveredOn, { date: likedOnOf(line.deliveredAt, locale) }), line.variantLabel].filter(Boolean).join(" · ")}
              outcome={inCard && line.productId === asked ? failure : null}
              form={<StorefrontQuickRating action={action} hidden={{ acao: "criar", produto: line.productId, retorno: back, entrada: routes.signIn() }} productName={line.name} messages={messages} />}
              linkComponent={AppLink}
              messages={messages}
            />
          ))}
        </div>
      ) : null}
    </StorefrontReviewsSection>
  )
}
