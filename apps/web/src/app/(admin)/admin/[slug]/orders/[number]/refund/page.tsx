// Next
import { notFound } from "next/navigation"

// App
import { OrderRefundScreen } from "@/components/orders/order-refund-screen"
import { getMessages } from "@/lib/locale"

/**
 * The refund of an order's payment (BEELINK-208), on a route of its own as every form is: of the
 * order's own payment, of money it did not ask for (`?stray=<id>`), or with the order's
 * cancellation (`?cancel=1`).
 */
export default async function OrderRefundPage({ params, searchParams }: PageProps<"/admin/[slug]/orders/[number]/refund">) {
  const { slug, number } = await params
  const query = await searchParams
  const parsed = Number(number)
  if (!/^\d+$/.test(number) || !Number.isSafeInteger(parsed) || parsed < 1) notFound()
  const stray = typeof query.stray === "string" && query.stray !== "" ? query.stray : null
  const { ui, web } = await getMessages()

  return <OrderRefundScreen slug={slug} number={parsed} cancel={query.cancel === "1"} strayId={stray} messages={ui} web={web} />
}
