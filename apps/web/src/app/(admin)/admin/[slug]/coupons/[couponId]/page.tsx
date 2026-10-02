// App
import { CouponEditorScreen } from "@/components/promotions/coupon-editor-screen"
import { getMessages } from "@/lib/locale"

/** One coupon, edited on its own page. Whose shop it is stays the API's to decide, on the read and on the save. */
export default async function CouponPage({ params }: PageProps<"/admin/[slug]/coupons/[couponId]">) {
  const { slug, couponId } = await params
  const { ui, web } = await getMessages()

  return <CouponEditorScreen slug={slug} couponId={couponId} messages={ui} web={web} />
}
