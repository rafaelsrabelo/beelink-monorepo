// Next
import { notFound } from "next/navigation"

// App
import { OrderScreen } from "@/components/orders/order-screen"
import { getMessages } from "@/lib/locale"

/** One order, by its number in the shop. Anything that is not a number is no order. */
export default async function OrderPage({ params }: PageProps<"/admin/[slug]/orders/[number]">) {
  const { slug, number } = await params
  const parsed = Number(number)
  if (!/^\d+$/.test(number) || !Number.isSafeInteger(parsed) || parsed < 1) notFound()
  const { ui, web } = await getMessages()

  return <OrderScreen slug={slug} number={parsed} messages={ui} web={web} />
}
