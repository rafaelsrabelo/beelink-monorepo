// App
import { AffiliateSettingsScreen } from "@/components/affiliates/affiliate-settings-screen"
import { getMessages } from "@/lib/locale"

/** The shop's affiliate programme (IMPULSEIA-102). A thin page over a client screen, like every other one in the panel. */
export default async function AffiliateSettingsPage({ params }: PageProps<"/admin/[slug]/affiliates/settings">) {
  const { slug } = await params
  const { ui, locale } = await getMessages()

  return <AffiliateSettingsScreen slug={slug} locale={locale} messages={ui} />
}
