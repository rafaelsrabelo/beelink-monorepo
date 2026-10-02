// App
import { PromotionsScreen } from "@/components/promotions/promotions-screen"
import { getMessages } from "@/lib/locale"

/** The shop's promotions (BEELINK-192), as a list; `new` and `<id>` are the pages that make and change one. */
export default async function PromotionsPage({ params }: PageProps<"/admin/[slug]/promotions">) {
  const { slug } = await params
  const { ui, web, locale } = await getMessages()

  return <PromotionsScreen slug={slug} locale={locale} messages={ui} web={web} />
}
