"use client"

// React
import { useEffect, useState } from "react"

// Next
import { useRouter } from "next/navigation"

// Types
import type { BillingAccountAnswer } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { SubscriptionAwaiting } from "@harness-monorepo/ui/blocks/billing/subscription-awaiting"
import { SubscriptionConfirmed } from "@harness-monorepo/ui/blocks/billing/subscription-confirmed"
import { SubscriptionCoupon } from "@harness-monorepo/ui/blocks/billing/subscription-coupon"
import { SubscriptionCouponApplied } from "@harness-monorepo/ui/blocks/billing/subscription-coupon-applied"
import { SubscriptionDue } from "@harness-monorepo/ui/blocks/billing/subscription-due"
import { SubscriptionPaid } from "@harness-monorepo/ui/blocks/billing/subscription-paid"
import { SubscriptionSkeleton } from "@harness-monorepo/ui/blocks/billing/subscription-skeleton"
import { SubscriptionStanding } from "@harness-monorepo/ui/blocks/billing/subscription-standing"
import { IntegrationsFailed } from "@harness-monorepo/ui/blocks/integrations/integrations-failed"

// App
import { AppLink } from "@/components/app-link"
import { IntegrationFrame } from "@/components/integrations/integration-frame"
import { errorSentenceOf } from "@/lib/error-sentence"
import { CONFIRMED_LINGER_MS, offersOf, subscribeViewOf, type SubscribeView } from "@/lib/subscribe-view"
import { dayInWords } from "@/lib/subscription-dates"
import type { WebMessages } from "@/locales"
import { useBillingAccount, usePlanCatalog, useRedeemCoupon, useStoreSubscription, useSubscriptionCheck, type SubscriptionCheckMode } from "@/services/billing/billing-hooks"
import { BillingRequestError } from "@/services/billing/billing-requests"
import { SubscribeCheckoutLive, type OpenedInvoice } from "./subscribe-checkout-live"

export interface SubscribeScreenProps {
  slug: string
  locale: string
  /** The page's panel: the way back, where a page with nothing to buy is led, and where a confirmed payment goes on to. */
  back: { href: string; label: string }
  messages: UiMessages
  errors: WebMessages["errors"]
}

const codeOf = (error: unknown): string => (error instanceof BillingRequestError ? error.errorCode : "UNKNOWN")

/** An invoice the page has out — to pay, or to carry on paying — which a payment made elsewhere may have settled since. */
function invoiceOutIn(view: SubscribeView | null): boolean {
  if (view?.kind === "choose") return view.openInvoice !== null
  if (view?.kind === "due") return view.invoiceUrl !== null
  return view?.kind === "active" && view.paid.renewalInvoiceUrl !== null
}

/** The invoice the screen waits on: one it opened that the page still owes — an attempt still out, or a renewal still due. */
function waitingInvoiceOf(view: SubscribeView | null, opened: OpenedInvoice | null): string | null {
  if (opened === null) return null
  if (view?.kind === "choose") return view.openInvoice?.invoiceUrl ?? null
  return view?.kind === "due" ? view.invoiceUrl : null
}

/**
 * The page's Assinar screen (BEELINK-293), on a page of its own: where the page stands with
 * bee-link, its plan bought by the cycle at Asaas's invoice, and the wait until the API says it was
 * paid — after which the screen goes on to the page's panel.
 *
 * Whether there is anything to buy is the subscription's answer, read here: with billing off, a page
 * owing nothing, or one from before subscriptions, the screen leads back to the panel and offers
 * nothing — a skeleton until the answer arrives. The amounts are the catalogue's and the days the
 * subscription's; no figure is written here.
 *
 * A page that never paid and used no coupon is offered one of bee-link's beside the cycles
 * (BEELINK-224): taken, the page is free for a month, and the screen goes on to its panel as it does
 * once a payment is confirmed.
 */
export function SubscribeScreen({ slug, locale, back, messages, errors }: SubscribeScreenProps) {
  const text = messages.subscription
  const router = useRouter()
  const answer = useStoreSubscription(slug)
  const view = answer.data ? subscribeViewOf(answer.data, new Date(), locale) : null
  // Nothing is asked of the plans or of who is charged where nothing is sold.
  const sells = view !== null && view.kind !== "leave"
  const catalog = usePlanCatalog(sells)
  const account = useBillingAccount(sells)
  const [opened, setOpened] = useState<OpenedInvoice | null>(null)
  const [notYet, setNotYet] = useState(false)
  const coupon = useRedeemCoupon(slug)

  const waitingInvoice = waitingInvoiceOf(view, opened)
  const waiting = waitingInvoice !== null
  const confirmed = opened !== null && view?.kind === "active"
  const mode: SubscriptionCheckMode = waiting ? "watch" : invoiceOutIn(view) && !confirmed ? "once" : "off"
  const check = useSubscriptionCheck(slug, mode)
  // Paid, or free for a month: either way the page is open, and the screen goes on to its panel.
  const done = confirmed || coupon.isSuccess

  useEffect(() => {
    if (view?.kind === "leave") router.replace(back.href as Parameters<typeof router.replace>[0])
  }, [view?.kind, back.href, router])

  useEffect(() => {
    if (!done) return
    const timer = setTimeout(() => router.replace(back.href as Parameters<typeof router.replace>[0]), CONFIRMED_LINGER_MS)
    return () => clearTimeout(timer)
  }, [done, back.href, router])

  // Until a title is drawn, a reader is still told which page this is.
  const untitled = <h1 className="sr-only">{text.untitled}</h1>
  const unread = answer.error ?? catalog.error ?? (account.error && codeOf(account.error) !== "BILLING_UNAVAILABLE" ? account.error : null)
  if (unread) {
    const retry = () => void Promise.all([answer.error && answer.refetch(), catalog.error && catalog.refetch(), account.error && account.refetch()])
    const code = codeOf(unread)
    const message = code === "STORE_NOT_FOUND" || code === "STORE_FORBIDDEN" ? errorSentenceOf(errors, code) : text.failed
    return <IntegrationFrame back={back} result={null}>{untitled}<IntegrationsFailed onRetry={retry} message={message} messages={messages} /></IntegrationFrame>
  }
  const reading = view === null || view.kind === "leave" || catalog.isPending || (account.isPending && account.fetchStatus !== "idle")
  if (reading) return <IntegrationFrame back={back} result={null}>{untitled}<SubscriptionSkeleton /></IntegrationFrame>

  const sale = catalog.data ? offersOf(catalog.data, view.kind === "choose" ? (view.openInvoice?.cycle ?? null) : null, new Date(), locale) : null
  const subscription = answer.data?.subscription
  const panel = { panelHref: back.href, linkComponent: AppLink, messages }

  async function checkNow() {
    setNotYet(false)
    const read = await check.refetch()
    setNotYet(read.data?.subscription?.status !== "ACTIVE")
  }

  const freeUntil = subscription?.freePeriodLastDay ? dayInWords(subscription.freePeriodLastDay, locale) : null
  // Only where the API would take one, and where this deployment can charge at all.
  const couponField =
    view.kind === "choose" && view.coupon && !account.error ? (
      <SubscriptionCoupon
        onSubmit={(code) => {
          coupon.reset()
          coupon.mutate({ code })
        }}
        pending={coupon.isPending}
        error={coupon.error ? errorSentenceOf(errors, codeOf(coupon.error)) : undefined}
        invoiceOpen={view.openInvoice !== null}
        messages={messages}
      />
    ) : null

  return (
    <IntegrationFrame back={back} result={null}>
      <SubscriptionStanding plan={sale?.plan.name ?? null} standing={view.standing} messages={messages} />
      {coupon.isSuccess ? (
        <SubscriptionCouponApplied freeUntil={freeUntil} {...panel} />
      ) : confirmed ? (
        <SubscriptionConfirmed paidUntil={view.kind === "active" ? view.paid.paidUntil : null} {...panel} />
      ) : waitingInvoice !== null && opened !== null ? (
        <SubscriptionAwaiting
          invoiceUrl={waitingInvoice}
          cycle={subscription?.cycle ?? null}
          priceCents={subscription?.priceCents ?? null}
          locale={locale}
          priceChanged={opened.priceChanged}
          onCheck={() => void checkNow()}
          checking={check.isFetching}
          notYet={notYet}
          onChoose={view.kind === "choose" ? () => setOpened(null) : undefined}
          messages={messages}
        />
      ) : view.kind === "active" ? (
        <SubscriptionPaid view={view.paid} locale={locale} {...panel} />
      ) : view.kind === "due" ? (
        <SubscriptionDue invoiceUrl={view.invoiceUrl} onOpen={() => setOpened({ priceChanged: false })} onCheck={() => void checkNow()} checking={check.isFetching} messages={messages} />
      ) : (
        <>
          {couponField}
          <SubscribeCheckoutLive
            slug={slug}
            locale={locale}
            offers={sale?.offers ?? []}
            openInvoice={view.openInvoice}
            account={accountOf(account.data)}
            loss={view.loss}
            blocked={sale === null || account.error ? text.unavailable : undefined}
            onOpened={setOpened}
            messages={messages}
            errors={errors}
          />
        </>
      )}
    </IntegrationFrame>
  )
}

function accountOf(answer: BillingAccountAnswer | undefined) {
  return answer?.account ? { name: answer.account.name, document: answer.account.document, documentType: answer.account.documentType } : null
}
