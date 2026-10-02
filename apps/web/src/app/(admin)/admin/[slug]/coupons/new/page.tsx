// App
import { CouponEditorScreen } from "@/components/promotions/coupon-editor-screen"
import { getMessages } from "@/lib/locale"

/** A coupon that does not exist yet, on a page of its own and not above the list. */
export default async function NewCouponPage({ params }: PageProps<"/admin/[slug]/coupons/new">) {
  const { slug } = await params
  const { ui, web } = await getMessages()

  return <CouponEditorScreen slug={slug} messages={ui} web={web} />
}
