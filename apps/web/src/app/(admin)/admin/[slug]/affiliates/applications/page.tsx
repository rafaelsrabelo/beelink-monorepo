// App
import { AffiliateApplicationsScreen } from "@/components/affiliates/affiliate-applications-screen"
import { getMessages } from "@/lib/locale"

/** The applications the shop's "Seja afiliado" page took (plan 2026-11-14). */
export default async function AffiliateApplicationsPage({ params }: PageProps<"/admin/[slug]/affiliates/applications">) {
  const { slug } = await params
  const { ui, locale } = await getMessages()

  return <AffiliateApplicationsScreen slug={slug} locale={locale} messages={ui} />
}
