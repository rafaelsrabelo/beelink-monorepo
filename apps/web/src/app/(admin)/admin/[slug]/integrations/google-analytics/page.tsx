// App
import { GoogleAnalyticsScreen } from "@/components/integrations/google-analytics-screen"
import { getMessages } from "@/lib/locale"

/**
 * The shop's Google Analytics (BEELINK-302): the measurement ID its owner pastes here, and where it
 * is found at Google. Nothing arrives in the address: no third party sends the browser back.
 */
export default async function GoogleAnalyticsPage({ params }: PageProps<"/admin/[slug]/integrations/google-analytics">) {
  const [{ slug }, { ui }] = await Promise.all([params, getMessages()])

  return <GoogleAnalyticsScreen slug={slug} messages={ui} />
}
