"use client"

// React
import { useEffect, useRef } from "react"

// Next
import { useRouter } from "next/navigation"

// Types
import type { OrderPaymentStatus } from "@harness-monorepo/contracts"

// App
import { paymentPollMsOf, paymentScreenOf, type PaymentOrderFacts } from "@/lib/order-payment-view"
import { useOrderPayment } from "@/services/storefront/order-payment-hooks"

/** The order's page asks half as often as the payment screen: nobody is standing over a QR code here. */
const WATCH_SLOWDOWN = 2

export interface OrderPaymentWatchProps {
  slug: string
  number: number
  /** The charge's status as the page was drawn with it; null with no charge yet. */
  status: OrderPaymentStatus | null
  order: PaymentOrderFacts
}

/**
 * The order's page following its payment (BEELINK-205). The page is drawn on the server and says
 * "Aguardando pagamento"; this draws nothing, reads the charge while it waits for money, and reads
 * the page again the moment the charge is no longer what the page says — so it turns to "Pagamento
 * aprovado" under the shopper's eyes. Mounted only while there is something to wait for; the
 * real-time event of BEELINK-206 will do the same at once, and this stays as the net under it.
 */
export function OrderPaymentWatch({ slug, number, status, order }: OrderPaymentWatchProps) {
  const router = useRouter()
  const read = useOrderPayment(slug, number, (answer) => {
    const wait = paymentPollMsOf(paymentScreenOf(answer.payment, order, new Date()))
    return wait === false ? false : wait * WATCH_SLOWDOWN
  })
  const heard = read.data && read.isFetchedAfterMount ? (read.data.payment?.status ?? null) : undefined
  // One refresh for each status heard: a page slow to follow is not asked for again at every read.
  const told = useRef<OrderPaymentStatus | null | undefined>(undefined)

  useEffect(() => {
    if (heard === undefined || heard === status || told.current === heard) return
    told.current = heard
    router.refresh()
  }, [heard, status, router])

  return null
}
