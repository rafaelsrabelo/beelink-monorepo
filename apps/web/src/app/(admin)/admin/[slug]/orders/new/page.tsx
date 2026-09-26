// App
import { NewOrderScreen } from "@/components/orders/new-order-screen"
import { getMessages } from "@/lib/locale"

/** Registering an order. `?customer=<id>` arrives from a customer's page with that customer chosen. */
export default async function NewOrderPage({ params, searchParams }: PageProps<"/admin/[slug]/orders/new">) {
  const { slug } = await params
  const { customer } = await searchParams
  const { ui, web } = await getMessages()

  return <NewOrderScreen slug={slug} customerId={typeof customer === "string" && customer !== "" ? customer : null} messages={ui} web={web} />
}
