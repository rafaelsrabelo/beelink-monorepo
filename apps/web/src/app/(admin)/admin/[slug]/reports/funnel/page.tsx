// App
import { StoreFunnelScreen } from "@/components/reports/store-funnel-screen"
import { getMessages } from "@/lib/locale"

/**
 * The shop's funnel (BEELINK-276): where its customers give up, from the visit to the purchase. A
 * page of its own under the reports, like the sales by origin.
 */
export default async function StoreFunnelPage({ params }: PageProps<"/admin/[slug]/reports/funnel">) {
  const [{ slug }, { ui, locale }] = await Promise.all([params, getMessages()])

  return <StoreFunnelScreen slug={slug} locale={locale} messages={ui} />
}
