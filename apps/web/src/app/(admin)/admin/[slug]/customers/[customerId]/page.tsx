// App
import { CustomerScreen } from "@/components/customers/customer-screen"
import { getMessages } from "@/lib/locale"

/** One customer's record. The id goes to the API as it came: one the shop does not have is its 404. */
export default async function CustomerPage({ params }: PageProps<"/admin/[slug]/customers/[customerId]">) {
  const { slug, customerId } = await params
  const { ui, web } = await getMessages()

  return <CustomerScreen slug={slug} customerId={customerId} messages={ui} web={web} />
}
