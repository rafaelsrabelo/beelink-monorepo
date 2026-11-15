// App
import { AffiliateSettingsScreen } from "@/components/affiliates/affiliate-settings-screen"
import { getMessages } from "@/lib/locale"
import { siteOrigin } from "@/lib/site-origin"

/**
 * The shop's affiliate programme (IMPULSEIA-102) and its "Seja afiliado" page (plan 2026-11-14). A thin
 * page over a client screen, like every other one in the panel; the platform's origin is read from the
 * request, the panel being served on the platform's host alone.
 */
export default async function AffiliateSettingsPage({ params }: PageProps<"/admin/[slug]/affiliates/settings">) {
  const [{ slug }, { ui, locale }, origin] = await Promise.all([params, getMessages(), siteOrigin()])

  return <AffiliateSettingsScreen slug={slug} origin={origin} locale={locale} messages={ui} />
}
