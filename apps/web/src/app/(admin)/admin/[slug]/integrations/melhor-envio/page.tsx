// App
import { MelhorEnvioScreen } from "@/components/integrations/melhor-envio-screen"
import { getMessages } from "@/lib/locale"
import { integrationResultOf } from "@/lib/melhor-envio-form"

/**
 * The shop's Melhor Envio (BEELINK-183). The way back from Melhor Envio lands here with what came of
 * the connection in the address, which the page says over the card.
 */
export default async function MelhorEnvioPage({ params, searchParams }: PageProps<"/admin/[slug]/integrations/melhor-envio">) {
  const [{ slug }, query, { ui, locale }] = await Promise.all([params, searchParams, getMessages()])

  return <MelhorEnvioScreen slug={slug} result={integrationResultOf(query, ui.integrations.result)} locale={locale} messages={ui} />
}
