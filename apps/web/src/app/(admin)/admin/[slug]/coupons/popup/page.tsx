// App
import { PopupScreen } from "@/components/promotions/popup-screen"
import { getMessages } from "@/lib/locale"

/**
 * The shop's first-purchase pop-up (BEELINK-306): its own page, one click from the coupons' list —
 * a form is never drawn above a list here. `popup` is no coupon's id (those are UUIDs), and a
 * static segment is matched before `[couponId]`.
 */
export default async function PopupPage({ params }: PageProps<"/admin/[slug]/coupons/popup">) {
  const { slug } = await params
  const { ui, locale } = await getMessages()

  return <PopupScreen slug={slug} locale={locale} messages={ui} />
}
