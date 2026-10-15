// App
import { SubscribeScreen } from "@/components/billing/subscribe-screen"
import { getMessages } from "@/lib/locale"

/**
 * A page's Assinar screen (BEELINK-293): its plan bought by the cycle, paid at Asaas's invoice. No
 * entry in the menu leads here — the plan's card on the panel's home and the locked page's notice do,
 * through `subscribePageOf()`. Whether there is anything to buy is the screen's to read: it leads
 * back to the panel where nothing is charged.
 */
export default async function SubscribePage({ params }: PageProps<"/admin/[slug]/subscribe">) {
  const [{ slug }, { ui, web, locale }] = await Promise.all([params, getMessages()])

  return <SubscribeScreen slug={slug} locale={locale} back={{ href: `/admin/${encodeURIComponent(slug)}`, label: web.stores.nav.home }} messages={ui} errors={web.errors} />
}
