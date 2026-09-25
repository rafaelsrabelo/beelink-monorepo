// App
import { OrdersScreen } from "@/components/orders/orders-screen"
import { getMessages } from "@/lib/locale"

/** The shop's orders. A thin page over a client screen, like every other one in the panel. */
export default async function OrdersPage({ params }: PageProps<"/admin/[slug]/orders">) {
  const { slug } = await params
  const { ui, web } = await getMessages()

  return <OrdersScreen slug={slug} messages={ui} web={web} />
}
