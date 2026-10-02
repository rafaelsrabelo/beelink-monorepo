// App
import { PromotionEditorScreen } from "@/components/promotions/promotion-editor-screen"
import { getMessages } from "@/lib/locale"

/** One promotion, edited on its own page. Whose shop it is stays the API's to decide, on the read and on the save. */
export default async function PromotionPage({ params }: PageProps<"/admin/[slug]/promotions/[promotionId]">) {
  const { slug, promotionId } = await params
  const { ui, web } = await getMessages()

  return <PromotionEditorScreen slug={slug} promotionId={promotionId} messages={ui} web={web} />
}
