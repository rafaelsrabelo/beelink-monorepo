// App
import { GestorCouponsScreen } from "@/components/gestor/gestor-coupons-screen"
import { getMessages } from "@/lib/locale"

/** The manager's coupons, switched from the counter. */
export default async function GestorCouponsPage({ params }: PageProps<"/admin/[slug]/gestor/cupons">) {
  const { slug } = await params
  const { ui, web, locale } = await getMessages()

  return <GestorCouponsScreen slug={slug} locale={locale} messages={ui} web={web} />
}
