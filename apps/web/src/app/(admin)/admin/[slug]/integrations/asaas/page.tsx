// App
import { AsaasScreen } from "@/components/integrations/asaas-screen"
import { getMessages } from "@/lib/locale"

/**
 * The shop's Asaas (BEELINK-203): its account, connected with the key its owner pastes here, and how
 * the shop is paid through it. Nothing arrives in the address: no third party sends the browser back.
 */
export default async function AsaasPage({ params }: PageProps<"/admin/[slug]/integrations/asaas">) {
  const [{ slug }, { ui }] = await Promise.all([params, getMessages()])

  return <AsaasScreen slug={slug} messages={ui} />
}
