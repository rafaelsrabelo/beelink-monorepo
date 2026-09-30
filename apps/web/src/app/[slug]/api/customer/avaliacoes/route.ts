// Next
import { NextResponse, type NextRequest } from "next/server"

// Types
import type { CreateReviewPayload, ReviewRating, UpdateReviewPayload } from "@harness-monorepo/contracts"

// App
import { callApi, isApiErrorBody } from "@/lib/api"
import { clientIpOf, publicOriginOf, refuseForeignOrigin } from "@/lib/bff"
import { clearCustomerSessionCookies, setCustomerSessionCookies } from "@/lib/customer-session-cookies"
import { REVIEW_PRODUCT_KEY, REVIEW_SAVED, REVIEW_SENT, REVIEWS_ERROR_KEY, reviewAnchorOf } from "@/lib/review-view"
import { callAsShopper } from "@/lib/shopper-call"
import { PRODUCT_ID, SHOP_SLUG } from "@/lib/shopper-forward"
import { BACK_KEY, safeBackOf } from "@/lib/storefront-routes"

const RATINGS: readonly string[] = ["1", "2", "3", "4", "5"]

/**
 * A review from Avaliar compras (J18), sent or edited through a plain form, so the tab works without
 * a script. Under the shop's own path, where the shopper's cookies live; the answer is a 303 back to
 * the tab, at the product's place, with what came of it or why not.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/[slug]/api/customer/avaliacoes">) {
  const refused = refuseForeignOrigin(request)
  if (refused) return refused

  const { slug } = await params
  if (!SHOP_SLUG.test(slug)) return NextResponse.json({ statusCode: 404, errorCode: "NOT_FOUND", message: "No such shop" }, { status: 404 })

  const form = await request.formData().catch(() => null)
  const field = (name: string) => {
    const value = form?.get(name)
    return typeof value === "string" ? value : ""
  }
  const back = safeBackOf(slug, field("retorno"))
  const editing = field("acao") === "editar"
  const target = editing ? field("avaliacao") : field("produto")
  const landing = new URL(back, publicOriginOf(request))
  const productId = field("produto")
  // The product's card is where the page lands, and where it says what came of the post.
  if (PRODUCT_ID.test(productId)) {
    landing.searchParams.set(REVIEW_PRODUCT_KEY, productId)
    landing.hash = reviewAnchorOf(productId)
  }
  const refuse = (code: string) => {
    landing.searchParams.set(REVIEWS_ERROR_KEY, code)
    return NextResponse.redirect(landing, 303)
  }
  // A rating is what the stars send; anything else is a form nobody drew.
  if (!PRODUCT_ID.test(target) || !RATINGS.includes(field("nota"))) return refuse(RATINGS.includes(field("nota")) ? "UNKNOWN" : "BAD_REQUEST")

  const rating = Number(field("nota")) as ReviewRating
  // The box sent is the comment: emptied, it is removed. A browser sends its line breaks as CRLF,
  // which would count twice against the API's 1000 characters.
  const comment = field("comentario").replace(/\r\n/g, "\n").trim() || null
  const base = `/stores/${encodeURIComponent(slug)}/customer/reviews`
  const answered = await callAsShopper(request, slug, (accessToken) =>
    callApi(
      editing
        ? { path: `${base}/${target}`, method: "PUT", body: { rating, comment } satisfies UpdateReviewPayload, accessToken, clientIp: clientIpOf(request) }
        : { path: base, method: "POST", body: { productId: target, rating, comment } satisfies CreateReviewPayload, accessToken, clientIp: clientIpOf(request) },
    ).catch(() => null),
  )
  if (answered.status === "signedOut") {
    // The session ended elsewhere meanwhile: nothing was sent, which the sign-in says, and it brings
    // the shopper back to the tab.
    const signIn = new URL(safeBackOf(slug, field("entrada")), publicOriginOf(request))
    signIn.searchParams.set(BACK_KEY, back)
    signIn.searchParams.set("erro", "CUSTOMER_SESSION_ENDED")
    const signedOut = NextResponse.redirect(signIn, 303)
    clearCustomerSessionCookies(signedOut.cookies, slug)
    return signedOut
  }
  const { response, renewed } = answered

  if (response?.ok) landing.searchParams.set("aviso", editing ? REVIEW_SAVED : REVIEW_SENT)
  else {
    const payload: unknown = response ? await response.json().catch(() => null) : null
    landing.searchParams.set(REVIEWS_ERROR_KEY, isApiErrorBody(payload) ? String(payload.errorCode) : response?.status === 429 ? "RATE_LIMITED" : "UNKNOWN")
  }

  const answer = NextResponse.redirect(landing, 303)
  if (renewed) setCustomerSessionCookies(answer.cookies, slug, renewed)
  return answer
}
