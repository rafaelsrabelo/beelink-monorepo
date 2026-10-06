// App
import { IntegrationsScreen } from "@/components/integrations/integrations-screen"
import { getMessages } from "@/lib/locale"

/** Every integration there is, a card each, connected or not; each has a page of its own. */
export default async function IntegrationsPage({ params }: PageProps<"/admin/[slug]/integrations">) {
  const [{ slug }, { ui }] = await Promise.all([params, getMessages()])

  return <IntegrationsScreen slug={slug} messages={ui} />
}
