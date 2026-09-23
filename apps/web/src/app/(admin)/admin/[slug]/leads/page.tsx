// App
import { LeadsScreen } from "@/components/leads/leads-screen"
import { getMessages } from "@/lib/locale"

/** A site's leads. A thin page over a client screen, like every other one in the panel. */
export default async function LeadsPage({ params }: PageProps<"/admin/[slug]/leads">) {
  const { slug } = await params
  const { ui, web } = await getMessages()

  return <LeadsScreen slug={slug} messages={ui} web={web} />
}
