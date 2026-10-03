// App
import { NewIntegrationScreen } from "@/components/integrations/new-integration-screen"
import { getMessages } from "@/lib/locale"

/** Adding an integration: what there is to connect, on a page of its own and not above the list. */
export default async function NewIntegrationPage({ params }: PageProps<"/admin/[slug]/integrations/new">) {
  const [{ slug }, { ui }] = await Promise.all([params, getMessages()])

  return <NewIntegrationScreen slug={slug} messages={ui} />
}
