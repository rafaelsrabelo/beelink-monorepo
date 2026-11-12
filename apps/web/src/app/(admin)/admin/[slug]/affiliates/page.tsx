// App
import { AffiliatesListScreen } from "@/components/affiliates/affiliates-list-screen"
import { getMessages } from "@/lib/locale"

/** The menu's "Afiliados": the shop's affiliates (IMPULSEIA-104). */
export default async function AffiliatesPage({ params }: PageProps<"/admin/[slug]/affiliates">) {
  const { slug } = await params
  const { ui, locale } = await getMessages()

  return <AffiliatesListScreen slug={slug} locale={locale} messages={ui} />
}
