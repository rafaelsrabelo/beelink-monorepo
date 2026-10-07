"use client"

// React
import { useEffect, useMemo } from "react"

// Next
import { useRouter } from "next/navigation"

// Types
import type { CustomerOrderPaymentAnswer } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontPaymentCard } from "@harness-monorepo/ui/blocks/storefront/storefront-payment-card"
import { StorefrontPaymentLayout } from "@harness-monorepo/ui/blocks/storefront/storefront-payment-layout"
import { StorefrontPaymentNotice } from "@harness-monorepo/ui/blocks/storefront/storefront-payment-notice"
import { StorefrontPaymentPix } from "@harness-monorepo/ui/blocks/storefront/storefront-payment-pix"
import { StorefrontPaymentSkeleton } from "@harness-monorepo/ui/blocks/storefront/storefront-payment-skeleton"
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"

// App
import { AppLink } from "@/components/app-link"
import { usePurchaseTold } from "@/components/storefront/tracking/use-purchase-told"
import { IN_PROGRESS_REREAD_MS, orderPaymentRefusalOf, rereadsThePayment } from "@/lib/order-payment-refusal"
import { purchaseOf, type PurchaseOrder } from "@/lib/purchase"
import { paymentDeadlineOf, paymentInstallmentsText, paymentPollMsOf, paymentScreenOf, type PaymentOrderFacts } from "@/lib/order-payment-view"
import { useMakeOrderPayment, useOrderPayment } from "@/services/storefront/order-payment-hooks"
import { ShopperOrderError } from "@/services/storefront/storefront-requests"

/** How long "Pagamento aprovado" stays before the page goes on to the order: long enough to be read. */
export const APPROVED_LINGER_MS = 4_000

export interface OrderPaymentLiveProps {
  slug: string
  number: number
  /** The order's page: the way back, and where an approved payment leads. */
  orderHref: string
  /** Where the shopper adds their CPF, coming back here after: what `PAYMENT_DOCUMENT_MISSING` leads to. */
  profileHref: string
  /** What the page read of the order: cancelled, or waiting on the shop for its delivery fee. */
  order: PaymentOrderFacts
  /** What the page read of the order as a sale: with the charge read here, whether it is a purchase to tell. */
  sale: PurchaseOrder
  locale: string
  messages: UiMessages
}

/**
 * The payment screen of one order (BEELINK-205), wired to the shop's handlers. It reads the charge
 * from the bee-link API — never from Asaas — and keeps reading while it waits for money and the tab
 * is in sight; the moment the API says paid, it says "Pagamento aprovado" and goes on to the order.
 * Nothing the browser saw at Asaas, and no page Asaas sends the shopper back to, marks it paid.
 *
 * That same moment is the order's purchase (BEELINK-273): told here on the API's word, once, and
 * never of a charge still to be paid.
 */
export function OrderPaymentLive({ slug, number, orderHref, profileHref, order, sale, locale, messages }: OrderPaymentLiveProps) {
  const text = messages.storefront
  const router = useRouter()
  const screenOf = (answer: CustomerOrderPaymentAnswer) => paymentScreenOf(answer.payment, order, new Date())
  const read = useOrderPayment(slug, number, (answer) => paymentPollMsOf(screenOf(answer)))
  const make = useMakeOrderPayment(slug, number)
  const { refetch } = read
  const { reset } = make

  // Only what was read since this screen opened: an answer kept from an earlier visit may show a QR already paid.
  const screen = read.data && read.isFetchedAfterMount ? screenOf(read.data) : null
  const paid = screen?.kind === "notice" && screen.variant === "paid"
  // The charge as read since this screen opened, on the order the page read: a kept answer tells nothing.
  const heard = read.data && read.isFetchedAfterMount ? read.data.payment : undefined
  const purchase = useMemo(() => (heard === undefined ? null : purchaseOf({ ...sale, payment: heard }, new Date())), [heard, sale])
  usePurchaseTold(slug, purchase)
  const refused = make.error ? (make.error instanceof ShopperOrderError ? make.error.errorCode : "UNKNOWN") : null
  // A refusal is of a try to make a charge: once the screen shows one to pay, or a state with none to make — paid, cancelled — it describes nothing here.
  const stale = refused === null || (screen !== null && !(screen.kind === "notice" && screen.acts))
  const signedOut = (read.error instanceof ShopperOrderError && read.error.errorCode === "AUTH_UNAUTHENTICATED") || refused === "AUTH_UNAUTHENTICATED"

  useEffect(() => {
    if (!paid) return
    const timer = setTimeout(() => router.replace(orderHref as Parameters<typeof router.replace>[0]), APPROVED_LINGER_MS)
    return () => clearTimeout(timer)
  }, [paid, orderHref, router])

  // The charge moved under the screen: it is read again — after a moment, when another request is still making it.
  useEffect(() => {
    if (!rereadsThePayment(refused)) return
    // Once read, the sentence has done its work: what the screen shows now is the answer.
    const timer = setTimeout(() => void refetch().then(reset), refused === "PAYMENT_IN_PROGRESS" ? IN_PROGRESS_REREAD_MS : 0)
    return () => clearTimeout(timer)
  }, [refused, refetch, reset])

  // The session ended: the page is read again, and sends the shopper to sign in and back.
  useEffect(() => {
    if (signedOut) router.refresh()
  }, [signedOut, router])

  const money = (cents: number) => formatCents(cents, locale, "BRL")
  const charge = () => make.mutate()

  return (
    <StorefrontPaymentLayout
      number={number}
      orderHref={orderHref}
      alert={stale ? null : orderPaymentRefusalOf(refused, text)}
      alertAction={
        !stale && refused === "PAYMENT_DOCUMENT_MISSING" ? (
          <AppLink href={profileHref} className="w-fit font-semibold underline">
            {text.paymentAddDocument}
          </AppLink>
        ) : undefined
      }
      linkComponent={AppLink}
      messages={messages}
    >
      {screen === null ? (
        read.isError ? (
          <StorefrontPaymentNotice variant="unread" orderHref={orderHref} onAction={() => void refetch()} pending={read.isFetching} linkComponent={AppLink} messages={messages} />
        ) : (
          <StorefrontPaymentSkeleton />
        )
      ) : screen.kind === "pix" ? (
        <StorefrontPaymentPix amount={money(screen.amountCents)} image={screen.image} payload={screen.payload} validUntil={paymentDeadlineOf(screen.expiresAt, locale)} messages={messages} />
      ) : screen.kind === "card" ? (
        <StorefrontPaymentCard
          amount={money(screen.amountCents)}
          installments={paymentInstallmentsText(screen.amountCents, screen.installments, money, text)}
          invoiceUrl={screen.invoiceUrl}
          validUntil={paymentDeadlineOf(screen.expiresAt, locale)}
          messages={messages}
        />
      ) : (
        <StorefrontPaymentNotice variant={screen.variant} orderHref={orderHref} onAction={screen.acts ? charge : undefined} pending={make.isPending} linkComponent={AppLink} messages={messages} />
      )}
    </StorefrontPaymentLayout>
  )
}
