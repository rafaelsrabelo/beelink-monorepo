// App
import { AffiliateOwedScreen } from "@/components/affiliates/affiliate-owed-screen"
import { getMessages } from "@/lib/locale"

/** What the shop owes its affiliates, by due day (IMPULSEIA-107). */
export default async function AffiliateOwedPage({ params }: PageProps<"/admin/[slug]/affiliates/owed">) {
  const [{ slug }, { ui, locale }] = await Promise.all([params, getMessages()])

  return <AffiliateOwedScreen slug={slug} locale={locale} messages={ui} />
}
