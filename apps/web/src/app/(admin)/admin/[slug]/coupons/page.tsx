// App
import { CouponsScreen } from "@/components/promotions/coupons-screen"
import { getMessages } from "@/lib/locale"

/** The shop's coupons (BEELINK-192), as a list; `new` and `<id>` are the pages that make and change one. */
export default async function CouponsPage({ params }: PageProps<"/admin/[slug]/coupons">) {
  const { slug } = await params
  const { ui, web, locale } = await getMessages()

  return <CouponsScreen slug={slug} locale={locale} messages={ui} web={web} />
}
