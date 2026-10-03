// App
import { IntegrationsScreen } from "@/components/integrations/integrations-screen"
import { getMessages } from "@/lib/locale"
import { integrationResultOf } from "@/lib/melhor-envio-form"

/**
 * The shop's integrations (BEELINK-183). The way back from Melhor Envio lands here with what came of
 * the connection in the address, which the page says over the card.
 */
export default async function IntegrationsPage({ params, searchParams }: PageProps<"/admin/[slug]/integrations">) {
  const [{ slug }, query, { ui, locale }] = await Promise.all([params, searchParams, getMessages()])

  return <IntegrationsScreen slug={slug} result={integrationResultOf(query, ui.integrations.result)} locale={locale} messages={ui} />
}
