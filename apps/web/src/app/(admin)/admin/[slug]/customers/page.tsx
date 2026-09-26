// App
import { CustomersScreen } from "@/components/customers/customers-screen"
import { getMessages } from "@/lib/locale"

/** The shop's customers, as the CRM. A thin page over a client screen, like every other one in the panel. */
export default async function CustomersPage({ params }: PageProps<"/admin/[slug]/customers">) {
  const { slug } = await params
  const { ui, web } = await getMessages()

  return <CustomersScreen slug={slug} messages={ui} web={web} />
}
